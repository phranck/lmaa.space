export interface OllamaMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface OllamaGenerateOptions {
  /** Ollama API host URL. Defaults to http://localhost:11434 */
  host?: string;
  /** API key for Ollama Cloud (sent as Bearer token) */
  apiKey?: string;
  /** Model name, e.g. "qwen3.5:397b-cloud" */
  model: string;
  /** Chat messages to send */
  messages: OllamaMessage[];
  /** Sampling temperature. Defaults to 0.3 */
  temperature?: number;
  /** Maximum tokens to generate */
  maxTokens: number;
  /** Context window size override */
  numCtx?: number;
  /** Request timeout in ms. Defaults to 240000 */
  timeoutMs?: number;
  /** Max retry attempts for transient errors. Defaults to 2 */
  maxRetries?: number;
  /** Enable streaming (currently unused, reserved). Defaults to false */
  stream?: boolean;
  /** Enable thinking/reasoning mode. Defaults to false */
  think?: boolean;
}

export interface OllamaResponse {
  model: string;
  message: {
    role: string;
    content: string;
  };
  done: boolean;
  total_duration?: number;
  eval_count?: number;
}
