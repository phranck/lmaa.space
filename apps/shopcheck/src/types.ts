export type Level = "info" | "error";

export type Shop = {
  id: number;
  name: string;
  url: string;
};

export type ResultsState = {
  generatedAt: string;
  entries: Array<Record<string, unknown>>;
  skipped: Array<Record<string, unknown>>;
};

export type RunnerState = {
  status: "idle" | "running" | "stopped" | "completed" | "failed";
  startedAt: string | null;
  updatedAt: string | null;
  completed: number;
  total: number;
  processedShopIds: number[];
  currentShop: Shop | null;
  mode: "run" | "resume";
  model: string;
  pipelineProgress: number;
  metrics: { parseFailures: number; timeouts: number; succeeded: number };
};

export type Args = {
  batchSize: number | null;
  singleUrl: string | null;
  help: boolean;
  statusOnly: boolean;
  resetOnly: boolean;
};

export type PromptState =
  | { type: "startMode"; cursor: 0 | 1; resolve: (mode: "resume" | "reset") => void }
  | { type: "batchSize"; cursor: number; options: Array<{ label: string; value: number | null }>; resolve: (batchSize: number | null) => void }
  | null;

export type LogEntry = {
  ts: string;
  level: Level;
  message: string;
};
