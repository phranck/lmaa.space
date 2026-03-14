import { existsSync, readFileSync, rmSync } from "node:fs";
import { resolve } from "node:path";

import { render, useApp } from "ink";
import React, { useEffect, useState } from "react";

import { ShopcheckEngine } from "./engine";
import { parseArgs } from "./lib/utils";
import { PATHS, SHOPCHECK_DIR } from "./paths";
import type { PromptState, Shop } from "./types";
import { ShopcheckApp } from "./ui/App";
import { useEngineRuntime } from "./ui/hooks/useEngineRuntime";

function printHelp(): void {
  process.stdout.write(
    [
      "Usage: shopcheck [options]",
      "",
      "Options:",
      "  --url <url>      Check a single URL instead of loading from DB",
      "  --import <file>  Load shops from a JSON file instead of the DB",
      "  --batch <n>      Max number of shops for this run",
      "  --status         Print current persisted status and exit",
      "  --reset          Remove local state/results/logs and exit",
      "  --help           Show this help",
      "",
    ].join("\n"),
  );
}

function resetState(): void {
  rmSync(PATHS.state, { force: true });
  rmSync(PATHS.results, { force: true });
  rmSync(PATHS.resultsState, { force: true });
  rmSync(PATHS.log, { force: true });
  rmSync(PATHS.metricsHistory, { force: true });
  rmSync(PATHS.reports, { force: true, recursive: true });
  rmSync(PATHS.rejections, { force: true });
  process.stdout.write(`Reset shopcheck state in ${SHOPCHECK_DIR}\n`);
}

function Root({ engine }: { engine: ShopcheckEngine }): React.ReactElement {
  const { exit } = useApp();
  const rawModeSupported = Boolean(process.stdin.isTTY && typeof process.stdin.setRawMode === "function");
  const { state, logs, prompt, fatalError } = useEngineRuntime({ engine, rawModeSupported, exit });
  const [localPrompt, setLocalPrompt] = useState<PromptState>(prompt);

  useEffect(() => {
    setLocalPrompt(prompt);
  }, [prompt]);

  return (
    <ShopcheckApp
      engine={engine}
      state={state}
      logs={logs}
      prompt={localPrompt}
      setPrompt={setLocalPrompt}
      fatalError={fatalError}
      rawModeSupported={rawModeSupported}
    />
  );
}

export async function runCli(): Promise<void> {
  const args = parseArgs(process.argv);

  if (args.help) {
    printHelp();
    return;
  }
  if (args.statusOnly) {
    process.stdout.write(existsSync(PATHS.state) ? readFileSync(PATHS.state, "utf8") : '{"status":"idle","message":"no state file yet"}\n');
    return;
  }
  if (args.resetOnly) {
    resetState();
    return;
  }

  const engineOpts: { batchSize: number | null; singleUrl?: string } = { batchSize: args.batchSize };
  if (args.singleUrl) engineOpts.singleUrl = args.singleUrl;

  const deps: ConstructorParameters<typeof ShopcheckEngine>[1] = {};
  if (args.importFile) {
    const filePath = resolve(args.importFile);
    if (!existsSync(filePath)) {
      process.stderr.write(`Error: file not found: ${filePath}\n`);
      process.exitCode = 1;
      return;
    }
    const raw = JSON.parse(readFileSync(filePath, "utf8")) as unknown;
    if (!Array.isArray(raw) || !raw.every((entry): entry is Shop =>
      typeof entry === "object" && entry !== null &&
      typeof (entry as Record<string, unknown>).id === "number" &&
      typeof (entry as Record<string, unknown>).name === "string" &&
      typeof (entry as Record<string, unknown>).url === "string"
    )) {
      process.stderr.write("Error: file must contain an array of { id, name, url } objects\n");
      process.exitCode = 1;
      return;
    }
    const shops = raw as Shop[];
    deps.loadShops = async () => shops;
    process.stdout.write(`Loaded ${shops.length} shops from ${filePath}\n`);
  }

  const engine = new ShopcheckEngine(engineOpts, deps);
  for (const signal of ["SIGINT", "SIGTERM", "SIGHUP"]) {
    process.on(signal, () => engine.requestShutdown(signal));
  }
  render(<Root engine={engine} />);
}
