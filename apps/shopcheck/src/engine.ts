import { EventEmitter } from "node:events";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";

import { SHOPCHECK_USER_AGENT } from "./constants";
import { loadShops } from "./lib/db";
import { appendNdjson, isResumableState, nowIso, readJson, writeJson } from "./lib/utils";
import { LlmFatalError, getModelName, setLlmProvider } from "./llm/client";
import { PATHS, SHOPCHECK_DIR } from "./paths";
import { geocodeWithFallback } from "./pipeline/geocode";
import { runDeterministicOllamaFlow } from "./pipeline/ollama-runner";
import type { LogEntry, LlmProvider, ResultsState, RunnerState, Shop } from "./types";

export type EngineConfig = {
  batchSize: number | null;
  singleUrl?: string;
  provider?: LlmProvider;
};

export type EngineDeps = {
  persist?: boolean;
  isInteractive?: () => boolean;
  chooseStartMode?: () => Promise<"resume" | "reset">;
  loadShops?: () => Promise<Shop[]>;
  processShop?: (shop: Shop) => Promise<Record<string, unknown>>;
  runDeterministicOllamaFlow?: typeof runDeterministicOllamaFlow;
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
    model: getModelName("extraction"),
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

  buildResultsArray(): Array<Record<string, unknown>> {
    return this.results.entries
      .filter((entry) => entry.shopJson && typeof entry.shopJson === "object")
      .map((entry) => entry.shopJson as Record<string, unknown>);
  }

  buildResultsPayload(): Record<string, unknown> | Array<Record<string, unknown>> {
    const resultsArray = this.buildResultsArray();
    if (this.config.singleUrl && resultsArray.length === 1) return resultsArray[0];
    return resultsArray;
  }

  hasPersistableResults(): boolean {
    return this.results.entries.length > 0 || this.results.skipped.length > 0;
  }

  constructor(config: EngineConfig, deps: EngineDeps = {}) {
    super();
    this.config = config;
    this.defaultProvider = "ollama";
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
      const provider = "ollama";
      this.state = {
        ...baseState,
        ...persisted,
        provider,
        model: getModelName("extraction"),
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
    const nextModel = partial.model ?? (partial.provider ? getModelName("extraction") : this.state.model);
    this.state = { ...this.state, ...partial, provider: nextProvider, model: nextModel, updatedAt: nowIso() };
    if (this.deps.persist !== false) {
      writeJson(PATHS.state, this.state);
      if (this.hasPersistableResults()) {
        if (this.config.singleUrl && this.results.entries.length === 1 && this.results.entries[0].shopJson) {
          writeJson(PATHS.resultsState, this.results.entries[0].shopJson);
        } else {
          writeJson(PATHS.resultsState, this.results);
        }
        writeJson(PATHS.results, this.buildResultsPayload());
      }
    }
    this.emit("state", this.state);
  }

  clearRuntimeState(provider: LlmProvider = "ollama"): void {
    if (this.deps.persist !== false) {
      rmSync(PATHS.state, { force: true });
      rmSync(PATHS.results, { force: true });
      rmSync(PATHS.resultsState, { force: true });
      rmSync(PATHS.log, { force: true });
      rmSync(PATHS.metricsHistory, { force: true });
      rmSync(PATHS.reports, { force: true, recursive: true });
      rmSync(PATHS.rejections, { force: true, recursive: true });
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

    this.persistState({ pipelineProgress: 0 });
    const runDeterministic = this.deps.runDeterministicOllamaFlow ?? runDeterministicOllamaFlow;

    this.emitLog(`[${shop.id}] Starting deterministic ollama pipeline for ${shop.url}...`);

    const result = await runDeterministic({
      shopUrl: shop.url,
      shopName: shop.name,
      onProgress: (message) => this.emitLog(message),
    });

    this.emitLog(`[${shop.id}] Agent verdict: ${result.verdict}`);
    this.persistState({ pipelineProgress: 90 });

    // For accept results: run geocoding if the agent didn't resolve coordinates
    if (result.verdict === "accept" && result.shopJson) {
      if (!result.shopJson.geo?.latitude) {
        const hq = result.shopJson.headquarters;
        const geo = await geocodeWithFallback({
          street: hq.street,
          postalCode: hq.postalCode,
          city: hq.city,
          countryCode: hq.countryCode,
          userAgent: SHOPCHECK_USER_AGENT,
        });
        result.shopJson = { ...result.shopJson, geo };
        this.emitLog(`[${shop.id}] Geocoded: ${geo.latitude}, ${geo.longitude}`);
      }
    }

    this.persistState({ pipelineProgress: 100 });

    return {
      shopName: result.shopName,
      shopUrl: result.shopUrl,
      verdict: result.verdict,
      shopJson: result.shopJson,
      rejectionMarkdown: result.rejectionMarkdown,
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
          this.clearRuntimeState("ollama");
          mode = "run";
        } else {
          mode = "resume";
        }
      } else {
        mode = "resume";
      }
    }

    const provider: LlmProvider = "ollama";
    setLlmProvider(provider);
    this.persistState({
      status: "running",
      startedAt: this.state.startedAt ?? nowIso(),
      mode,
      currentShop: null,
      provider,
      model: getModelName("extraction"),
    });

    const extractionModel = getModelName("extraction");
    const narrativeModel = getModelName("narrative");
    this.emitLog(`LLM provider=${provider}: extraction=${extractionModel}, narrative=${narrativeModel}`);


    let selected: Shop[];
    const processedIds = new Set<number>();
    if (this.config.singleUrl) {
      const raw = this.config.singleUrl;
      const url = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
      const hostnameMatch = url.match(/^https?:\/\/(?:www\.)?([^/?#:]+)/i);
      const hostname = hostnameMatch ? hostnameMatch[1] : new URL(url).hostname.replace(/^www\./, "");
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
    let hadErrors = false;
    for (const shop of selected) {
      if (this.shutdownRequested) break;
      this.persistState({ currentShop: shop });
      this.emitLog(`Processing shop ${shop.id}: ${shop.name} <${shop.url}>`);
      try {
        const result = await this.processShop(shop);
        if (result.verdict === "reject") {
          if (this.deps.persist !== false) {
            // processShop resolves rejectionMarkdown to a plain string
            // (parsed markdown or raw fullResponse as fallback).
            const rejMd = result.rejectionMarkdown as string | null;
            const body = rejMd?.trim()
              || `### Shop-Prüfung: ${result.shopName ?? shop.name}\n\n**URL:** ${shop.url}`;
            const hostname = new URL(shop.url).hostname.replace(/^www\./, "");
            mkdirSync(PATHS.rejections, { recursive: true });
            writeFileSync(`${PATHS.rejections}/${hostname}.txt`, `${body}\n`, "utf8");
            if (!rejMd?.trim()) {
              this.emitLog(`Warning: rejection markdown parse failed — raw LLM output saved.`, "error");
            }
          }
          this.results.skipped.push({ shopId: shop.id, existingName: shop.name, existingUrl: shop.url, verdict: "reject" });
          this.emitLog(`Shop ${shop.id} rejected — written to rejections/${new URL(shop.url).hostname.replace(/^www\./, "")}.txt`);
        } else if (result.verdict === "accept") {
          this.state.metrics.succeeded += 1;
          this.results.entries.push({ shopId: shop.id, ...result });
          this.emitLog(`Processed shop ${shop.id} successfully.`);
        } else {
          hadErrors = true;
          this.results.skipped.push({ shopId: shop.id, existingName: shop.name, existingUrl: shop.url, verdict: "error" });
          this.emitLog(`Shop ${shop.id} ended with verdict=error. No shopJson written.`, "error");
        }
      } catch (error) {
        if (error instanceof LlmFatalError) {
          this.emitLog(`FATAL: ${error.message}`, "error");
          this.emitLog("Stopping run due to fatal LLM error.", "error");
          break;
        }
        hadErrors = true;
        const message = error instanceof Error ? error.message : String(error);
        this.results.skipped.push({ shopId: shop.id, existingName: shop.name, existingUrl: shop.url, verdict: "error", notes: message });
        this.emitLog(`Error on shop ${shop.id}: ${message}`, "error");
      }
      processedIds.add(shop.id);
      batchCompleted += 1;
      this.persistState({ completed: batchCompleted, pipelineProgress: 0, processedShopIds: [...processedIds].sort((a, b) => a - b) });
    }

    this.persistState({ status: this.shutdownRequested ? "stopped" : hadErrors ? "failed" : "completed", currentShop: null });
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
