import { Box, Text, useInput } from "ink";
import React, { useMemo } from "react";

import { ShopcheckEngine } from "../engine";
import type { PromptState, RunnerState } from "../types";
import { handlePromptInput } from "./hooks/usePromptInput";
import { useTerminalSize } from "./hooks/useTerminalSize";

function statusColor(status: RunnerState["status"]): "greenBright" | "yellowBright" | "redBright" | "cyanBright" | "gray" {
  if (status === "completed") return "greenBright";
  if (status === "running") return "yellowBright";
  if (status === "failed") return "redBright";
  if (status === "stopped") return "cyanBright";
  return "gray";
}

function formatPct(completed: number, total: number, pipelineProgress: number): number {
  if (!Number.isFinite(total) || total <= 0) return 0;
  return Math.max(0, Math.min(100, Math.round((completed * 100 + pipelineProgress) / total)));
}

function progressBar(width: number, pct: number): string {
  const safe = Math.max(10, width);
  const filled = Math.round((safe * pct) / 100);
  return `${"█".repeat(filled)}${"░".repeat(Math.max(0, safe - filled))}`;
}

function truncate(text: string, max: number): string {
  if (max <= 4) return text.slice(0, Math.max(0, max));
  return text.length > max ? `${text.slice(0, max - 3)}...` : text;
}

export function ShopcheckApp({
  engine,
  state,
  logs,
  prompt,
  setPrompt,
  fatalError,
  rawModeSupported,
}: {
  engine: ShopcheckEngine;
  state: RunnerState;
  logs: Array<{ id: string; line: string }>;
  prompt: PromptState;
  setPrompt: (next: PromptState | ((prev: PromptState) => PromptState)) => void;
  fatalError: string | null;
  rawModeSupported: boolean;
}): React.ReactElement {
  const { cols, rows } = useTerminalSize();
  const tiny = rows < 18 || cols < 72;

  useInput(
    (input, key) => {
      const consumed = handlePromptInput({ prompt, input, key, setPrompt, engine });
      if (consumed) return;
      if (!prompt && (input === "q" || key.escape || (key.ctrl && input === "c"))) {
        engine.requestShutdown("keyboard");
      }
    },
    { isActive: rawModeSupported },
  );

  const header = useMemo(() => {
    const current = state.currentShop ? `${state.currentShop.id} ${state.currentShop.name}` : "none";
    return truncate(
      `status=${state.status} | mode=${state.mode} | provider=${state.provider} | model=${state.model} | progress=${state.completed}/${state.total} | current=${current}`,
      cols - 6,
    );
  }, [state, cols]);
  const pct = formatPct(state.completed, state.total, state.pipelineProgress);
  const barWidth = Math.max(10, cols - 20);
  const bar = progressBar(barWidth, pct);
  const promptVisible = Boolean(prompt);
  const maxLogLines = tiny ? Math.max(2, rows - (promptVisible ? 12 : 8)) : Math.max(3, rows - (promptVisible ? 16 : 11));
  const visibleLogs = logs.slice(-maxLogLines);

  return (
    <Box flexDirection="column" width={cols} height={rows} padding={1}>
      <Box borderStyle="round" borderColor="cyan" paddingX={1} justifyContent="space-between">
        <Text color="cyanBright">LMAA Shopcheck TUI</Text>
        <Text color={statusColor(state.status)}>{state.status.toUpperCase()}</Text>
      </Box>
      <Box marginTop={1} borderStyle="round" borderColor="blue" paddingX={1} flexDirection="column">
        <Text>{header}</Text>
        <Box>
          <Text color="gray">Progress </Text>
          <Text color="greenBright">{bar}</Text>
          <Text color="gray"> {pct}%</Text>
        </Box>
      </Box>
      <Text color="gray">
        {rawModeSupported
          ? "Use arrows + Enter. q/ESC/Ctrl+C = graceful shutdown"
          : "Non-interactive input detected."}
      </Text>
      {fatalError ? <Text color="red">Fatal: {fatalError}</Text> : null}
      {tiny ? <Text color="yellow">Kleines Terminal erkannt: kompakte Ansicht aktiv.</Text> : null}

      {prompt?.type === "startMode" ? (
        <Box marginTop={1} borderStyle="round" borderColor="green" flexDirection="column" paddingX={1}>
          <Text color="greenBright">Vorhandener Zwischenstand gefunden</Text>
          <Text>Waehle Startmodus:</Text>
          <Text color={prompt.cursor === 0 ? "greenBright" : undefined}>{prompt.cursor === 0 ? ">" : " "} Resume (weiter machen)</Text>
          <Text color={prompt.cursor === 1 ? "redBright" : undefined}>{prompt.cursor === 1 ? ">" : " "} Reset (von vorne)</Text>
        </Box>
      ) : null}

      {prompt?.type === "batchSize" ? (
        <Box marginTop={1} borderStyle="round" borderColor="cyan" flexDirection="column" paddingX={1}>
          <Text color="cyanBright">Batch-Auswahl</Text>
          <Text>Wie viele Shops im naechsten Lauf verarbeiten?</Text>
          {prompt.options.map((option, idx) => (
            <Text key={`${option.value ?? "all"}-${option.label}`} color={idx === prompt.cursor ? "greenBright" : undefined}>
              {idx === prompt.cursor ? ">" : " "} {option.label}
            </Text>
          ))}
        </Box>
      ) : null}

      <Box marginTop={1} borderStyle="round" borderColor="gray" flexDirection="column" paddingX={1} flexGrow={1}>
        <Text color="yellow">Live Log</Text>
        {visibleLogs.length === 0 ? <Text color="gray">No logs yet...</Text> : null}
        {visibleLogs.map((item) => (
          <Text key={item.id} wrap="truncate-end">
            {item.line}
          </Text>
        ))}
      </Box>
    </Box>
  );
}
