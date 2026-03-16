import { EventEmitter } from "node:events";
import { appendFileSync, mkdirSync, rmSync } from "node:fs";

import { SHOPCHECK_USER_AGENT } from "./constants";
import { loadShops } from "./lib/db";
import { appendNdjson, isResumableState, nowIso, readJson, writeJson } from "./lib/utils";
import { LlmFatalError, getModelName, resolveInitialLlmProvider, setLlmProvider } from "./llm/client";
import { PATHS, SHOPCHECK_DIR } from "./paths";
import { runShopCheckAgent } from "./pipeline/agent";
import { loadCategoriesCached } from "./pipeline/categories";
import { fetchAdmissionCriteria } from "./pipeline/criteria";
import { extractFacts } from "./pipeline/extract";
import { crawlRelevantPages } from "./pipeline/research";
import type { LogEntry, LlmProvider, ResultsState, RunnerState, Shop } from "./types";

export type EngineConfig = {
  batchSize: number | null;
  singleUrl?: string;
  provider: LlmProvider | null;
};

export type EngineDeps = {
  persist?: boolean;
  isInteractive?: () => boolean;
  chooseStartMode?: () => Promise<"resume" | "reset">;
  chooseProvider?: () => Promise<LlmProvider>;
  loadShops?: () => Promise<Shop[]>;
  processShop?: (shop: Shop) => Promise<Record<string, unknown>>;
  chooseBatchSize?: (pendingCount: number) => Promise<number | null>;
};

function createBaseState(provider: LlmProvider): RunnerState {
  return {
    status: "idle",
    startedAt: null,
    updatedAt: null,
    completed: 0,
    total: 0,
    processedShopIds: [],
    currentShop: null,
    mode: "run",
    provider,
    model: getModelName("extraction", provider),
    pipelineProgress: 0,
    metrics: { parseFailures: 0, timeouts: 0, succeeded: 0 },
  };
}

export class ShopcheckEngine extends EventEmitter {
  defaultProvider: LlmProvider;
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
    this.defaultProvider = resolveInitialLlmProvider(config.provider);
    this.deps = deps;
    const baseResults: ResultsState = { generatedAt: nowIso(), entries: [], skipped: [] };
    const baseState = createBaseState(this.defaultProvider);

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

      const persisted = readJson<Partial<RunnerState>>(PATHS.state, {});
      const provider = this.config.provider ?? persisted.provider ?? this.defaultProvider;
      this.state = {
        ...baseState,
        ...persisted,
        provider,
        model: getModelName("extraction", provider),
      };
    }

    setLlmProvider(this.state.provider);
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
    const nextProvider = partial.provider ?? this.state.provider;
    const nextModel = partial.model ?? (partial.provider ? getModelName("extraction", nextProvider) : this.state.model);
    this.state = { ...this.state, ...partial, provider: nextProvider, model: nextModel, updatedAt: nowIso() };
    if (this.deps.persist !== false) {
      writeJson(PATHS.state, this.state);
      if (this.results.entries.length > 0) {
        if (this.config.singleUrl && this.results.entries.length === 1 && this.results.entries[0].shopJson) {
          writeJson(PATHS.resultsState, this.results.entries[0].shopJson);
        } else {
          writeJson(PATHS.resultsState, this.results);
        }
        writeJson(PATHS.results, this.buildResultsArray());
      }
    }
    this.emit("state", this.state);
  }

  clearRuntimeState(provider = this.config.provider ?? this.state.provider ?? this.defaultProvider): void {
    if (this.deps.persist !== false) {
      rmSync(PATHS.state, { force: true });
      rmSync(PATHS.results, { force: true });
      rmSync(PATHS.resultsState, { force: true });
      rmSync(PATHS.log, { force: true });
      rmSync(PATHS.metricsHistory, { force: true });
      rmSync(PATHS.reports, { force: true, recursive: true });
      rmSync(PATHS.rejections, { force: true });
    }
    this.results = { generatedAt: nowIso(), entries: [], skipped: [] };
    this.state = createBaseState(provider);
    setLlmProvider(provider);
  }

  hasResumableState(): boolean {
    return isResumableState(this.state);
  }

  async chooseStartModeInteractive(): Promise<"resume" | "reset"> {
    if (this.deps.chooseStartMode) return this.deps.chooseStartMode();
    return new Promise((resolve) => this.emit("prompt:start-mode", { resolve }));
  }

  async chooseProviderInteractive(): Promise<LlmProvider> {
    if (this.deps.chooseProvider) return this.deps.chooseProvider();
    return new Promise((resolve) => this.emit("prompt:provider", { resolve }));
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

  async resolveProvider(mode: "run" | "resume", interactive: boolean): Promise<LlmProvider> {
    if (mode === "resume" && !this.config.provider) {
      return this.state.provider;
    }
    if (this.config.provider) return this.config.provider;
    if (interactive) return this.chooseProviderInteractive();
    return this.state.provider;
  }

  async processShop(shop: Shop): Promise<Record<string, unknown>> {
    if (this.deps.processShop) {
      return this.deps.processShop(shop);
    }

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

    this.persistState({ pipelineProgress: 15 });
    this.emitLog(`[${shop.id}] Phase 2: Deterministic extraction from ${pages.length} pages...`);
    const facts = extractFacts(pages);

    this.persistState({ pipelineProgress: 25 });
    this.emitLog(`[${shop.id}] Phase 3: ${this.state.provider} analysis with ${pages.length} pre-crawled pages...`);
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
      rejectionMarkdown: result.rejectionMarkdown?.markdown ?? (result.verdict === "reject" ? result.fullResponse : null),
    };
  }

  async run(): Promise<void> {
    mkdirSync(SHOPCHECK_DIR, { recursive: true });

    let mode: "run" | "resume" = "run";
    const interactive = this.deps.isInteractive ? this.deps.isInteractive() : process.stdin.isTTY;
    if (this.hasResumableState()) {
      if (interactive) {
        const picked = await this.chooseStartModeInteractive();
        if (picked === "reset") {
          this.clearRuntimeState(this.config.provider ?? this.state.provider);
          mode = "run";
        } else {
          mode = "resume";
        }
      } else {
        mode = "resume";
      }
    }

    const provider = await this.resolveProvider(mode, interactive);
    setLlmProvider(provider);
    this.persistState({
      status: "running",
      startedAt: this.state.startedAt ?? nowIso(),
      mode,
      currentShop: null,
      provider,
      model: getModelName("extraction", provider),
    });

    const extractionModel = getModelName("extraction", provider);
    const narrativeModel = getModelName("narrative", provider);
    this.emitLog(`LLM provider=${provider}: extraction=${extractionModel}, narrative=${narrativeModel}`);

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
        `Running: mode=${mode}, provider=${provider}, total=${shops.length}, pending=${pending.length}, batch=${batchSize ?? "ALL"} (${selected.length}).`,
      );
    }

    let batchCompleted = 0;
    for (const shop of selected) {
      if (this.shutdownRequested) break;
      this.persistState({ currentShop: shop });
      this.emitLog(`Processing shop ${shop.id}: ${shop.name} <${shop.url}>`);
      try {
        const result = await this.processShop(shop);
        this.state.metrics.succeeded += 1;
        if (result.verdict === "reject") {
          if (this.deps.persist !== false) {
            const body = typeof result.rejectionMarkdown === "string" && result.rejectionMarkdown.trim().length > 0
              ? result.rejectionMarkdown.trim()
              : `### Shop-Prüfung: ${result.shopName ?? shop.name}\n\n**URL:** ${shop.url}\n\n${result.fullResponse ?? ""}`.trim();
            appendFileSync(PATHS.rejections, `${body}\n\n---\n\n`, "utf8");
          }
          this.results.skipped.push({ shopId: shop.id, existingName: shop.name, existingUrl: shop.url, verdict: "reject" });
          this.emitLog(`Shop ${shop.id} rejected — markdown appended to rejection.txt`);
        } else {
          this.results.entries.push({ shopId: shop.id, ...result });
          this.emitLog(`Processed shop ${shop.id} successfully.`);
        }
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
