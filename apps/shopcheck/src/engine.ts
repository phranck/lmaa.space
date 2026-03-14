import { EventEmitter } from "node:events";
import { appendFileSync, mkdirSync, rmSync } from "node:fs";

import { SHOPCHECK_USER_AGENT } from "./constants";
import { loadShops } from "./lib/db";
import { appendNdjson, isResumableState, nowIso, readJson, writeJson } from "./lib/utils";
import { LlmFatalError, getModelName } from "./llm/client";
import { PATHS, SHOPCHECK_DIR } from "./paths";
import { runShopCheckAgent } from "./pipeline/agent";
import { loadCategoriesCached } from "./pipeline/categories";
import { fetchAdmissionCriteria } from "./pipeline/criteria";
import { extractFacts } from "./pipeline/extract";
import { crawlRelevantPages } from "./pipeline/research";
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
      if (this.config.singleUrl && this.results.entries.length === 1 && this.results.entries[0].shopJson) {
        writeJson(PATHS.resultsState, this.results.entries[0].shopJson);
      } else {
        writeJson(PATHS.resultsState, this.results);
      }
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

    // Phase 1: Pre-crawl the shop website (robust, deterministic)
    this.persistState({ pipelineProgress: 0 });
    this.emitLog(`[${shop.id}] Phase 1: Crawling shop pages...`);
    const pages = await crawlRelevantPages({
      shopUrl: shop.url,
      userAgent: SHOPCHECK_USER_AGENT,
      onProgress: (message) => this.emitLog(message),
    });
    if (pages.length === 0) {
      return { shopName: shop.name, shopUrl: shop.url, verdict: "error", shopJson: null };
    }

    // Phase 2: Deterministic fact extraction
    this.persistState({ pipelineProgress: 15 });
    this.emitLog(`[${shop.id}] Phase 2: Deterministic extraction from ${pages.length} pages...`);
    const facts = extractFacts(pages);

    // Phase 3: Agent-based analysis (with server-side web search)
    this.persistState({ pipelineProgress: 25 });
    this.emitLog(`[${shop.id}] Phase 3: Agent analysis with ${pages.length} pre-crawled pages...`);
    const result = await runShopCheckAgent({
      shopUrl: shop.url,
      shopName: shop.name,
      preCrawledPages: pages,
      preCrawledFacts: facts,
      admissionCriteriaText: this.admissionCriteriaText,
      categories: this.categoryCatalog,
      onProgress: (message) => this.emitLog(message),
    });

    this.emitLog(`[${shop.id}] Agent verdict: ${result.verdict}`);
    this.persistState({ pipelineProgress: 100 });

    return {
      shopName: result.shopName,
      shopUrl: result.shopUrl,
      verdict: result.verdict,
      shopJson: result.shopJson,
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
