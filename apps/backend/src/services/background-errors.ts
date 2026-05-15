import { logger } from "../lib/logger.js";
import { insertBackgroundError } from "../repositories/background-errors.js";

const REDACTED_VALUE = "[redacted]";
const MAX_ERROR_MESSAGE_LENGTH = 600;
const MAX_ERROR_DETAIL_DEPTH = 5;
const SENSITIVE_CONTEXT_KEY_PATTERN =
  /authorization|cookie|token|password|secret|api[_-]?key|access[_-]?key|private[_-]?key|credential/i;

interface NormalizedBackgroundError {
  message: string;
  details: Record<string, unknown> | null;
}

/**
 * Records an async background error to the database and logs it to stdout.
 *
 * Never throws — if the DB write fails, falls back to logger.error only.
 *
 * @param source - Caller identifier, e.g. "mastodon-post" or "shop-reminders".
 * @param error - The caught error value (any type).
 * @param context - Optional key/value context attached to the log entry.
 */
export async function recordBackgroundError(
  source: string,
  error: unknown,
  context?: Record<string, unknown>,
): Promise<void> {
  const { message, details } = normalizeBackgroundError(error);
  const sanitizedContext = buildBackgroundErrorContext(context, details);
  const logError = error instanceof Error ? error : (details ?? message);
  logger.error({ err: logError, source, ...(sanitizedContext ?? {}) }, "background error recorded");
  try {
    await insertBackgroundError({ source, message, context: sanitizedContext });
  } catch (insertErr) {
    logger.error({ err: insertErr, source, message }, "failed to persist background error");
  }
}

function normalizeBackgroundError(error: unknown): NormalizedBackgroundError {
  if (error instanceof Error) {
    return {
      message: truncateErrorMessage(error.message || error.name || "Unknown background error"),
      details: null,
    };
  }

  const sanitized = sanitizeErrorDetail(error);
  if (isPlainRecord(sanitized)) {
    return {
      message: truncateErrorMessage(buildObjectErrorMessage(sanitized)),
      details: sanitized,
    };
  }

  if (typeof sanitized === "string") {
    return { message: truncateErrorMessage(sanitized), details: null };
  }

  if (sanitized == null) {
    return { message: "Unknown background error", details: null };
  }

  return { message: truncateErrorMessage(String(sanitized)), details: null };
}

function buildBackgroundErrorContext(
  context: Record<string, unknown> | undefined,
  details: Record<string, unknown> | null,
): Record<string, unknown> | null {
  const sanitizedContext = context ? sanitizeErrorDetail(context) : null;
  const merged = isPlainRecord(sanitizedContext) ? { ...sanitizedContext } : {};

  if (details) {
    const detailsKey = Object.hasOwn(merged, "error") ? "errorDetails" : "error";
    merged[detailsKey] = details;
  }

  return Object.keys(merged).length > 0 ? merged : null;
}

function buildObjectErrorMessage(error: Record<string, unknown>): string {
  const nestedError = isPlainRecord(error.error) ? error.error : null;
  const target =
    getDisplayString(error, "message") || getDisplayString(error, "name") ? error : nestedError;

  if (target) {
    const name = getDisplayString(target, "name");
    const message = getDisplayString(target, "message");
    const code =
      getDisplayString(target, "code") ||
      getDisplayString(target, "statusCode") ||
      getDisplayString(target, "status") ||
      getDisplayString(target, "status_code");

    const primary = name && message && name !== message ? `${name}: ${message}` : (message ?? name);
    if (primary && code) return `${primary} (${code})`;
    if (primary) return primary;
  }

  return stringifyCompact(error);
}

function getDisplayString(record: Record<string, unknown>, key: string): string | null {
  const value = record[key];
  if (typeof value === "string") return value.trim() || null;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  return null;
}

function sanitizeErrorDetail(value: unknown): unknown {
  return sanitizeValue(value, new WeakSet(), 0, null);
}

function sanitizeValue(
  value: unknown,
  seen: WeakSet<object>,
  depth: number,
  key: string | null,
): unknown {
  if (key && SENSITIVE_CONTEXT_KEY_PATTERN.test(key)) return REDACTED_VALUE;
  if (value == null) return value;
  if (typeof value === "bigint") return value.toString();
  if (typeof value !== "object") return value;
  if (value instanceof Date) return value.toISOString();
  if (seen.has(value)) return "[circular]";
  if (depth >= MAX_ERROR_DETAIL_DEPTH) return "[max-depth]";

  seen.add(value);

  if (Array.isArray(value)) {
    return value.map((item) => sanitizeValue(item, seen, depth + 1, null));
  }

  return Object.fromEntries(
    Object.entries(value).map(([entryKey, entryValue]) => [
      entryKey,
      sanitizeValue(entryValue, seen, depth + 1, entryKey),
    ]),
  );
}

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function stringifyCompact(value: unknown): string {
  try {
    return JSON.stringify(value);
  } catch {
    return "Structured background error";
  }
}

function truncateErrorMessage(message: string): string {
  if (message.length <= MAX_ERROR_MESSAGE_LENGTH) return message;
  return `${message.slice(0, MAX_ERROR_MESSAGE_LENGTH - 1)}…`;
}
