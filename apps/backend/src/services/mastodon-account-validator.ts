export type VerifyResult =
  | { ok: true; username: string }
  | { ok: false; reason: "invalid_token" | "instance_unreachable"; message: string };

/**
 * Validates a Mastodon access token against the given instance by calling
 * `GET /api/v1/accounts/verify_credentials`.
 *
 * - HTTP 401/403 → `{ ok: false, reason: "invalid_token" }`
 * - HTTP 5xx or network error → `{ ok: false, reason: "instance_unreachable" }`
 * - HTTP 200 with `username` → `{ ok: true, username }`
 *
 * The access token is never included in error messages or logs.
 */
export async function verifyMastodonCredentials(
  instanceUrl: string,
  accessToken: string,
): Promise<VerifyResult> {
  const base = instanceUrl.replace(/\/+$/, "");
  const url = `${base}/api/v1/accounts/verify_credentials`;

  let response: Response;
  try {
    response = await fetch(url, {
      method: "GET",
      headers: { Authorization: `Bearer ${accessToken}` },
    });
  } catch {
    return {
      ok: false,
      reason: "instance_unreachable",
      message: "Could not reach the Mastodon instance. Check the instance URL.",
    };
  }

  if (response.status === 401 || response.status === 403) {
    return {
      ok: false,
      reason: "invalid_token",
      message: "The Mastodon instance rejected the access token.",
    };
  }

  if (!response.ok) {
    return {
      ok: false,
      reason: "instance_unreachable",
      message: `Mastodon instance returned an unexpected error (HTTP ${response.status}).`,
    };
  }

  let data: { username?: string };
  try {
    data = (await response.json()) as { username?: string };
  } catch {
    return {
      ok: false,
      reason: "instance_unreachable",
      message: "Mastodon instance returned a non-JSON response.",
    };
  }

  if (!data.username) {
    return {
      ok: false,
      reason: "instance_unreachable",
      message: "Mastodon instance returned an unexpected response (missing username).",
    };
  }

  return { ok: true, username: data.username };
}
