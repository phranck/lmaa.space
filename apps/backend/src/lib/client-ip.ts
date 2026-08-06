/**
 * Stand-in used when no trustworthy client address can be derived from a request.
 *
 * @remarks
 * Every caller that keys on the client address shares this one value, so all
 * such requests are counted and deduplicated together. Callers that would draw
 * a wrong conclusion from that, for example a uniqueness check, must test for
 * it explicitly instead of treating it as an address.
 *
 * Lives in its own module so that consumers can compare against it without
 * pulling in the rate-limit middleware and, with it, the database client and
 * the logger.
 */
export const UNKNOWN_CLIENT_IP = "unknown";
