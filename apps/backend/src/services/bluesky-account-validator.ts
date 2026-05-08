import { AtpAgent } from "@atproto/api";

import { BLUESKY_PDS_URL } from "@lmaa/contracts";

export type BlueskyVerifyResult =
  | { ok: true; did: string }
  | { ok: false; reason: "invalid_credentials"; message: string }
  | { ok: false; reason: "service_unreachable"; message: string };

/**
 * Verifies a BlueSky handle/app-password by attempting `agent.login()` against
 * the canonical PDS at `https://bsky.social`. The session is discarded — only
 * the success/failure outcome is returned. The app password is never logged.
 */
export async function verifyBlueskyCredentials(
  handle: string,
  appPassword: string,
): Promise<BlueskyVerifyResult> {
  const agent = new AtpAgent({ service: BLUESKY_PDS_URL });
  try {
    const response = await agent.login({ identifier: handle, password: appPassword });
    if (response.success && response.data.did) {
      return { ok: true, did: response.data.did };
    }
    return {
      ok: false,
      reason: "invalid_credentials",
      message: "BlueSky did not return a session.",
    };
  } catch (err) {
    const status = (err as { status?: number }).status;
    if (status === 400 || status === 401 || status === 403) {
      return {
        ok: false,
        reason: "invalid_credentials",
        message: "BlueSky rejected the credentials.",
      };
    }
    return {
      ok: false,
      reason: "service_unreachable",
      message: "BlueSky is unreachable.",
    };
  }
}
