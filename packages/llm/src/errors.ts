/** Non-retryable error thrown when the LLM request cannot succeed regardless of retries. */
export class LlmFatalError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = "LlmFatalError";
  }
}
