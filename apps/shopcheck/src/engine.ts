import { EventEmitter } from "node:events";
import { appendFileSync, mkdirSync, rmSync } from "node:fs";

import { SHOPCHECK_USER_AGENT } from "./constants";
import { loadShops } from "./lib/db";
import { appendNdjson, isResumableState, nowIso, readJson, writeJson } from "./lib/utils";
import { LlmFatalError, getModelName } from "./llm/client";
import { PATHS, SHOPCHECK_DIR } from "./paths";
import { analyzeShopWithLlm } from "./pipeline/analyze";
import { loadCategoriesCached } from "./pipeline/categories";
import { fetchAdmissionCriteria } from "./pipeline/criteria";
import { extractFacts, normalizeShipping } from "./pipeline/extract";
import { geocodeWithFallback } from "./pipeline/geocode";
import { buildShopJson } from "./pipeline/output";
import { crawlRelevantPages } from "./pipeline/research";
import { searchExternalContext, searchSocialMedia, webSearchFallback } from "./pipeline/web-search";
import type { LogEntry, ResultsState, RunnerState, Shop } from "./types";

export type EngineConfig = {
  batchSize: number | null;
  singleUrl?: string;
};

export type EngineDeps = {
  persist?: boolean;
  isInteractive?: () => boolean;
  chooseStartMode?: () => Promise<"resume" | "reset">;
  loadShops?: () => Promise<Shop[]>;
  processShop?: (shop: Shop) => Promise<Record<string, unknown>>;
  chooseBatchSize?: (pendingCount: number) => Promise<number | null>;
};

export class ShopcheckEngine extends EventEmitter {
  config: EngineConfig;
  deps: EngineDeps;
  shutdownRequested = false;
  results: ResultsState;
  state: RunnerState;
  admissionCriteriaText = "";
  categoryCatalog: string[] = [];

  buildResultsArray(): Array<Record<string, unknown>> {
    return this.results.entries
      .filter((entry) => entry.shopJson && typeof entry.shopJson === "object")
      .map((entry) => entry.shopJson as Record<string, unknown>);
  }

  mergeFacts(base: ReturnType<typeof extractFacts>, patch: Partial<ReturnType<typeof extractFacts>>): ReturnType<typeof extractFacts> {
    const patchAddrFields = [patch.address?.street, patch.address?.postalCode, patch.address?.city].filter(Boolean).length;
    const baseAddrFields = [base.address.street, base.address.postalCode, base.address.city].filter(Boolean).length;
    const preferPatchAddr = patchAddrFields >= baseAddrFields && patchAddrFields > 0;

    return {
      legalEntity: patch.legalEntity ?? base.legalEntity ?? null,
      legalEntityType: patch.legalEntityType ?? base.legalEntityType ?? null,
      owners: [...new Set([...(base.owners ?? []), ...(patch.owners ?? [])])],
      address: preferPatchAddr
        ? {
            street: patch.address?.street ?? base.address.street ?? null,
            postalCode: patch.address?.postalCode ?? base.address.postalCode ?? null,
            city: patch.address?.city ?? base.address.city ?? null,
            state: patch.address?.state ?? base.address.state ?? null,
            countryCode: patch.address?.countryCode ?? base.address.countryCode ?? null,
            sourceUrl: base.address.sourceUrl ?? patch.address?.sourceUrl ?? null,
          }
        : {
            street: base.address.street ?? patch.address?.street ?? null,
            postalCode: base.address.postalCode ?? patch.address?.postalCode ?? null,
            city: base.address.city ?? patch.address?.city ?? null,
            state: base.address.state ?? patch.address?.state ?? null,
            countryCode: base.address.countryCode ?? patch.address?.countryCode ?? null,
            sourceUrl: base.address.sourceUrl ?? patch.address?.sourceUrl ?? null,
          },
      contact: {
        emails: [...new Set([...(base.contact.emails ?? []), ...(patch.contact?.emails ?? [])])],
        phones: [...new Set([...(base.contact.phones ?? []), ...(patch.contact?.phones ?? [])])],
      },
      shippingRegions: normalizeShipping([...(base.shippingRegions ?? []), ...(patch.shippingRegions ?? [])]),
      languageGermanLikely: base.languageGermanLikely || Boolean(patch.languageGermanLikely),
      exclusionSignals: [...new Set([...(base.exclusionSignals ?? []), ...(patch.exclusionSignals ?? [])])],
      socialMedia: {
        mastodon: base.socialMedia.mastodon ?? patch.socialMedia?.mastodon ?? null,
        bluesky: base.socialMedia.bluesky ?? patch.socialMedia?.bluesky ?? null,
        twitter: base.socialMedia.twitter ?? patch.socialMedia?.twitter ?? null,
        instagram: base.socialMedia.instagram ?? patch.socialMedia?.instagram ?? null,
        tiktok: base.socialMedia.tiktok ?? patch.socialMedia?.tiktok ?? null,
        youtube: base.socialMedia.youtube ?? patch.socialMedia?.youtube ?? null,
        twitch: base.socialMedia.twitch ?? patch.socialMedia?.twitch ?? null,
        pinterest: base.socialMedia.pinterest ?? patch.socialMedia?.pinterest ?? null,
        linkedin: base.socialMedia.linkedin ?? patch.socialMedia?.linkedin ?? null,
        facebook: base.socialMedia.facebook ?? patch.socialMedia?.facebook ?? null,
        threads: base.socialMedia.threads ?? patch.socialMedia?.threads ?? null,
        patreon: base.socialMedia.patreon ?? patch.socialMedia?.patreon ?? null,
      },
      affiliateInfoUrl: base.affiliateInfoUrl ?? patch.affiliateInfoUrl ?? null,
      notes: {
        focus: [...new Set([...(base.notes.focus ?? []), ...(patch.notes?.focus ?? [])])],
        brandsOrProducts: [...new Set([...(base.notes.brandsOrProducts ?? []), ...(patch.notes?.brandsOrProducts ?? [])])],
        companyPresentation: patch.notes?.companyPresentation ?? base.notes.companyPresentation ?? null,
      },
      evidence: [...(base.evidence ?? []), ...(patch.evidence ?? [])],
    };
  }

  constructor(config: EngineConfig, deps: EngineDeps = {}) {
    super();
    this.config = config;
    this.deps = deps;
    const extractionModel = getModelName("extraction");
    const baseResults: ResultsState = { generatedAt: nowIso(), entries: [], skipped: [] };
    const baseState: RunnerState = {
      status: "idle",
      startedAt: null,
      updatedAt: null,
      completed: 0,
      total: 0,
      processedShopIds: [],
      currentShop: null,
      mode: "run",
      model: extractionModel,
      pipelineProgress: 0,
      metrics: { parseFailures: 0, timeouts: 0, succeeded: 0 },
    };
    if (this.deps.persist === false) {
      this.results = baseResults;
      this.state = baseState;
    } else {
      const legacyOrState = readJson<unknown>(PATHS.resultsState, readJson<unknown>(PATHS.results, baseResults));
      if (
        legacyOrState &&
        typeof legacyOrState === "object" &&
        !Array.isArray(legacyOrState) &&
        Array.isArray((legacyOrState as ResultsState).entries) &&
        Array.isArray((legacyOrState as ResultsState).skipped)
      ) {
        this.results = legacyOrState as ResultsState;
      } else {
        this.results = baseResults;
      }
      this.state = { ...baseState, ...readJson<Partial<RunnerState>>(PATHS.state, {}) };
    }
  }

  requestShutdown(source = "user"): void {
    this.shutdownRequested = true;
    this.emitLog(`Graceful shutdown requested (${source}).`);
  }

  emitLog(message: string, level: "info" | "error" = "info"): void {
    const entry: LogEntry = { ts: nowIso(), level, message };
    appendNdjson(PATHS.log, entry);
    this.emit("log", entry);
  }

  persistState(partial: Partial<RunnerState> = {}): void {
    this.state = { ...this.state, ...partial, updatedAt: nowIso() };
    if (this.deps.persist !== false) {
      writeJson(PATHS.state, this.state);
      writeJson(PATHS.resultsState, this.results);
      writeJson(PATHS.results, this.buildResultsArray());
    }
    this.emit("state", this.state);
  }

  clearRuntimeState(): void {
    if (this.deps.persist !== false) {
      rmSync(PATHS.state, { force: true });
      rmSync(PATHS.results, { force: true });
      rmSync(PATHS.resultsState, { force: true });
      rmSync(PATHS.log, { force: true });
      rmSync(PATHS.metricsHistory, { force: true });
      rmSync(PATHS.reports, { force: true, recursive: true });
      rmSync(PATHS.rejections, { force: true });
    }
    const extractionModel = getModelName("extraction");
    this.results = { generatedAt: nowIso(), entries: [], skipped: [] };
    this.state = {
      status: "idle",
      startedAt: null,
      updatedAt: null,
      completed: 0,
      total: 0,
      processedShopIds: [],
      currentShop: null,
      mode: "run",
      model: extractionModel,
      pipelineProgress: 0,
      metrics: { parseFailures: 0, timeouts: 0, succeeded: 0 },
    };
  }

  hasResumableState(): boolean {
    return isResumableState(this.state);
  }

  async chooseStartModeInteractive(): Promise<"resume" | "reset"> {
    if (this.deps.chooseStartMode) return this.deps.chooseStartMode();
    return new Promise((resolve) => this.emit("prompt:start-mode", { resolve }));
  }

  async chooseBatchSizeInteractive(pendingCount: number): Promise<number | null> {
    const preset = [1, 3, 5, 10, 25, 50, 100]
      .filter((n) => n < pendingCount)
      .map((n) => ({ label: `${n} Shops`, value: n as number | null }));
    const options = [...preset, { label: `Alle (${pendingCount})`, value: null as number | null }];
    return new Promise((resolve) => this.emit("prompt:batch-size", { options, resolve }));
  }

  async resolveBatchSize(pendingCount: number): Promise<number | null> {
    if (this.deps.chooseBatchSize) return this.deps.chooseBatchSize(pendingCount);
    if (this.config.batchSize && this.config.batchSize > 0) return this.config.batchSize;
    if (!(this.deps.isInteractive ? this.deps.isInteractive() : process.stdin.isTTY)) return null;
    return this.chooseBatchSizeInteractive(pendingCount);
  }

  async processShop(shop: Shop): Promise<Record<string, unknown>> {
    if (this.deps.processShop) {
      return this.deps.processShop(shop);
    }

    // Phase 1: Crawl (0-20%)
    this.persistState({ pipelineProgress: 0 });
    this.emitLog(`[${shop.id}] Crawling shop pages...`);
    const pages = await crawlRelevantPages({
      shopUrl: shop.url,
      userAgent: SHOPCHECK_USER_AGENT,
      onProgress: (message) => this.emitLog(message),
    });
    if (pages.length === 0) {
      return {
        shopName: shop.name,
        shopUrl: shop.url,
        verdict: "error",
        shopJson: null,
      };
    }

    // Phase 2: Deterministic extraction (20-25%)
    this.persistState({ pipelineProgress: 20 });
    this.emitLog(`[${shop.id}] Deterministic fact extraction from ${pages.length} pages...`);
    let allPages = [...pages];
    let deterministicFacts = extractFacts(allPages);

    // Phase 3: Web search for comprehensive coverage (25-35%)
    this.persistState({ pipelineProgress: 25 });
    this.emitLog(`[${shop.id}] Running web search for additional pages...`);
    const webPages = await webSearchFallback({
      shopName: shop.name,
      shopUrl: shop.url,
      userAgent: SHOPCHECK_USER_AGENT,
      onProgress: (message) => this.emitLog(message),
    });
    if (webPages.length > 0) {
      allPages = [...allPages, ...webPages.filter((p) => !allPages.some((q) => q.url === p.url))];
      deterministicFacts = extractFacts(allPages);
    }

    // Phase 3a: External counter-research (35-40%)
    this.persistState({ pipelineProgress: 35 });
    this.emitLog(`[${shop.id}] Running external counter-research...`);
    const externalContext = await searchExternalContext({
      shopName: shop.name,
      userAgent: SHOPCHECK_USER_AGENT,
      onProgress: (message) => this.emitLog(message),
    });
    if (externalContext.length > 0) {
      this.emitLog(`[${shop.id}] Found ${externalContext.length} external context result(s).`);
    }

    // Phase 3b: Active social media search (40-45%)
    this.persistState({ pipelineProgress: 40 });
    this.emitLog(`[${shop.id}] Searching for social media profiles...`);
    const socialSearchResults = await searchSocialMedia({
      shopName: shop.name,
      existingSocial: deterministicFacts.socialMedia,
      userAgent: SHOPCHECK_USER_AGENT,
      onProgress: (message) => this.emitLog(message),
    });
    const socialFound = Object.keys(socialSearchResults).length;
    if (socialFound > 0) {
      this.emitLog(`[${shop.id}] Found ${socialFound} additional social profile(s) via search.`);
      for (const [key, url] of Object.entries(socialSearchResults)) {
        if (url) {
          (deterministicFacts.socialMedia as Record<string, string | null>)[key] = url;
        }
      }
    }

    // Phase 4: Combined LLM analysis (45-75%)
    this.persistState({ pipelineProgress: 45 });
    this.emitLog(`[${shop.id}] LLM analysis (facts + criteria + categories) with ${allPages.length} pages...`);
    const analysis = await analyzeShopWithLlm({
      shopUrl: shop.url,
      pages: allPages,
      deterministicFacts,
      availableCategories: this.categoryCatalog,
      admissionCriteriaText: this.admissionCriteriaText,
      externalContext,
      onProgress: (message) => this.emitLog(message),
    });

    const llmAddr = analysis.factsPatch.address;
    this.emitLog(`[${shop.id}] LLM address: street=${llmAddr?.street ?? "null"}, postalCode=${llmAddr?.postalCode ?? "null"}, city=${llmAddr?.city ?? "null"}, country=${llmAddr?.countryCode ?? "null"}`);

    const facts = this.mergeFacts(deterministicFacts, analysis.factsPatch);
    const decision = analysis.decision;
    const matchedCategories = analysis.categories;

    // Phase 5: Geocoding (70-80%)
    this.persistState({ pipelineProgress: 70 });
    const addr = facts.address;
    this.emitLog(`[${shop.id}] Address data: street=${addr.street ?? "null"}, postalCode=${addr.postalCode ?? "null"}, city=${addr.city ?? "null"}, country=${addr.countryCode ?? "null"}`);
    this.emitLog(`[${shop.id}] Geocoding...`);
    const geo = await geocodeWithFallback({
      street: facts.address.street,
      postalCode: facts.address.postalCode,
      city: facts.address.city,
      countryCode: facts.address.countryCode,
      userAgent: SHOPCHECK_USER_AGENT,
    });
    if (!facts.address.state && geo.resolvedState) facts.address.state = geo.resolvedState;
    if (!facts.address.countryCode && geo.resolvedCountryCode) facts.address.countryCode = geo.resolvedCountryCode;
    if (!facts.address.city && geo.resolvedCity) facts.address.city = geo.resolvedCity;
    this.emitLog(`[${shop.id}] Geo result: ${geo.source}, lat=${geo.latitude ?? "null"}, lon=${geo.longitude ?? "null"}, country=${geo.resolvedCountryCode ?? "unknown"}, state=${geo.resolvedState ?? "unknown"}`);

    // Phase 6: Build JSON + description (80-100%)
    this.persistState({ pipelineProgress: 80 });
    this.emitLog(`[${shop.id}] Building shop JSON (verdict: ${decision.verdict})...`);
    const shopJson = await buildShopJson({
      shopName: shop.name,
      shopUrl: shop.url,
      decision,
      facts,
      geo,
      categories: matchedCategories,
      pageTexts: allPages.map((p) => ({ url: p.url, text: p.text })),
    });

    return {
      shopName: shop.name,
      shopUrl: shop.url,
      verdict: decision.verdict,
      shopJson,
    };
  }

  async run(): Promise<void> {
    mkdirSync(SHOPCHECK_DIR, { recursive: true });

    let mode: "run" | "resume" = "run";
    if (this.hasResumableState()) {
      const interactive = this.deps.isInteractive ? this.deps.isInteractive() : process.stdin.isTTY;
      if (interactive) {
        const picked = await this.chooseStartModeInteractive();
        if (picked === "reset") {
          this.clearRuntimeState();
          mode = "run";
        } else {
          mode = "resume";
        }
      } else {
        mode = "resume";
      }
    }

    this.persistState({ status: "running", startedAt: this.state.startedAt ?? nowIso(), mode, currentShop: null });

    const extractionModel = getModelName("extraction");
    const narrativeModel = getModelName("narrative");
    this.emitLog(`LLM: extraction=${extractionModel}, narrative=${narrativeModel}`);
    this.persistState({ model: extractionModel });

    this.emitLog("Loading current admission criteria...");
    this.admissionCriteriaText = await fetchAdmissionCriteria(SHOPCHECK_USER_AGENT);
    if (!this.admissionCriteriaText) this.emitLog("Admission criteria could not be loaded. Continuing with local fallback signals.", "error");
    this.emitLog("Loading categories API (session cache enabled)...");
    this.categoryCatalog = await loadCategoriesCached(SHOPCHECK_USER_AGENT);
    this.emitLog(`Categories loaded: ${this.categoryCatalog.length}`);

    let selected: Shop[];
    const processedIds = new Set<number>();
    if (this.config.singleUrl) {
      const raw = this.config.singleUrl;
      const url = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
      const hostname = new URL(url).hostname.replace(/^www\./, "");
      selected = [{ id: 0, name: hostname, url }];
      this.persistState({ total: 1, completed: 0, processedShopIds: [] });
      this.emitLog(`Single URL mode: ${url}`);
    } else {
      const shops = this.deps.loadShops ? await this.deps.loadShops() : await loadShops();
      const resumeIds = mode === "resume" ? (this.state.processedShopIds ?? []) : [];
      for (const id of resumeIds) processedIds.add(id);
      const pending = shops.filter((s) => !processedIds.has(s.id));
      const batchSize = await this.resolveBatchSize(pending.length);
      selected = batchSize ? pending.slice(0, batchSize) : pending;
      this.persistState({ total: selected.length, completed: 0, processedShopIds: [...processedIds].sort((a, b) => a - b) });
      this.emitLog(
        `Running: mode=${mode}, total=${shops.length}, pending=${pending.length}, batch=${batchSize ?? "ALL"} (${selected.length}).`,
      );
    }

    let batchCompleted = 0;
    for (const shop of selected) {
      if (this.shutdownRequested) break;
      this.persistState({ currentShop: shop });
      this.emitLog(`Processing shop ${shop.id}: ${shop.name} <${shop.url}>`);
      try {
        const result = await this.processShop(shop);
        this.results.entries.push({ shopId: shop.id, ...result });
        this.state.metrics.succeeded += 1;
        if (result.verdict === "reject" && this.deps.persist !== false) {
          appendFileSync(PATHS.rejections, `${shop.url}\n`, "utf8");
          this.emitLog(`Shop ${shop.id} rejected — URL appended to rejection.txt`);
        }
        this.emitLog(`Processed shop ${shop.id} successfully.`);
      } catch (error) {
        if (error instanceof LlmFatalError) {
          this.emitLog(`FATAL: ${error.message}`, "error");
          this.emitLog("Stopping run due to fatal LLM error.", "error");
          break;
        }
        const message = error instanceof Error ? error.message : String(error);
        this.results.skipped.push({ shopId: shop.id, existingName: shop.name, existingUrl: shop.url, verdict: "error", notes: message });
        this.emitLog(`Error on shop ${shop.id}: ${message}`, "error");
      }
      processedIds.add(shop.id);
      batchCompleted += 1;
      this.persistState({ completed: batchCompleted, pipelineProgress: 0, processedShopIds: [...processedIds].sort((a, b) => a - b) });
    }

    this.persistState({ status: this.shutdownRequested ? "stopped" : "completed", currentShop: null });
    if (this.deps.persist !== false) {
      appendNdjson(PATHS.metricsHistory, {
        ts: nowIso(),
        parseFailures: this.state.metrics.parseFailures,
        timeouts: this.state.metrics.timeouts,
        succeeded: this.state.metrics.succeeded,
      });
    }
  }
}
