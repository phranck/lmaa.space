import { useEffect, useState } from "react";

import { ShopcheckEngine } from "../../engine";
import type { PromptState, RunnerState, LogEntry } from "../../types";

type RuntimeState = {
  state: RunnerState;
  logs: Array<{ id: string; line: string }>;
  prompt: PromptState;
  setPrompt: (next: PromptState | ((prev: PromptState) => PromptState)) => void;
  fatalError: string | null;
};

const MAX_LOG_BUFFER = 2000;

export function useEngineRuntime({
  engine,
  rawModeSupported,
  exit,
}: {
  engine: ShopcheckEngine;
  rawModeSupported: boolean;
  exit: () => void;
}): RuntimeState {
  const [state, setState] = useState<RunnerState>(engine.state);
  const [logs, setLogs] = useState<Array<{ id: string; line: string }>>([]);
  const [fatalError, setFatalError] = useState<string | null>(null);
  const [prompt, setPrompt] = useState<PromptState>(null);

  useEffect(() => {
    const onState = (s: RunnerState) => setState({ ...s });
    const onLog = (entry: LogEntry) =>
      setLogs((prev) => [...prev.slice(-(MAX_LOG_BUFFER - 1)), { id: `${Date.now()}-${Math.random()}`, line: `${entry.ts} [${entry.level}] ${entry.message}` }]);

    const onStartModePrompt = ({ resolve }: { resolve: (mode: "resume" | "reset") => void }) => {
      if (!rawModeSupported) {
        resolve("resume");
        return;
      }
      setPrompt({ type: "startMode", cursor: 0, resolve });
    };

    const onBatchPrompt = ({
      options,
      resolve,
    }: {
      options: Array<{ label: string; value: number | null }>;
      resolve: (batchSize: number | null) => void;
    }) => {
      if (!rawModeSupported) {
        resolve(null);
        return;
      }
      setPrompt({ type: "batchSize", cursor: Math.max(0, options.length - 1), options, resolve });
    };

    engine.on("state", onState);
    engine.on("log", onLog);
    engine.on("prompt:start-mode", onStartModePrompt);
    engine.on("prompt:batch-size", onBatchPrompt);

    let finished = false;
    void (async () => {
      try {
        await engine.run();
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        setFatalError(message);
        engine.emitLog(`Fatal error: ${message}`, "error");
        engine.persistState({ status: "failed", currentShop: null });
      } finally {
        finished = true;
        setTimeout(() => exit(), 80);
      }
    })();

    return () => {
      engine.off("state", onState);
      engine.off("log", onLog);
      engine.off("prompt:start-mode", onStartModePrompt);
      engine.off("prompt:batch-size", onBatchPrompt);
      if (!finished) engine.requestShutdown("unmount");
    };
  }, [engine, exit, rawModeSupported]);

  return { state, logs, prompt, setPrompt, fatalError };
}
