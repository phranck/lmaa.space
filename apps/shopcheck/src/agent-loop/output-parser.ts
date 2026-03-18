import type { ShopJson } from "../pipeline/output";

export type AgentLoopResult = {
  shopName: string;
  shopUrl: string;
  verdict: "accept" | "reject" | "error";
  shopJson: ShopJson | null;
  /** Full formatted rejection markdown (header + Kurz- + Langbegründung), or null for accept/error. */
  rejectionMarkdown: string | null;
};

/**
 * Removes Quellen entries never referenced in the body text, then renumbers footnotes
 * sequentially from [^1]. Keeps citations honest and avoids orphaned references.
 */
export function normalizeFootnotes(longReason: string): string {
  const quellenIdx = longReason.indexOf("\n### Quellen");
  if (quellenIdx === -1) return longReason;

  const body = longReason.slice(0, quellenIdx + 1);
  const quellenSection = longReason.slice(quellenIdx + 1);

  const usedNums = new Set<number>();
  for (const m of body.matchAll(/\[\^(\d+)\]/g)) usedNums.add(Number(m[1]));

  const entries: Array<{ num: number; content: string }> = [];
  for (const m of quellenSection.matchAll(/^\[\^(\d+)\]\s+(.+)$/gm)) {
    entries.push({ num: Number(m[1]), content: m[2] });
  }

  const kept = entries.filter((e) => usedNums.has(e.num));
  if (kept.length === 0) return longReason;

  const renum = new Map<number, number>();
  kept.forEach((e, i) => renum.set(e.num, i + 1));

  const renumberedBody = body.replace(/\[\^(\d+)\]/g, (_, n) => {
    const next = renum.get(Number(n));
    return next !== undefined ? `[^${next}]` : `[^${n}]`;
  });

  const newQuellen = "### Quellen\n\n" + kept.map((e) => `[^${renum.get(e.num)}] ${e.content}`).join("\n");
  return renumberedBody + newQuellen;
}

/**
 * Parses the arguments of the finish() tool call into an AgentLoopResult.
 */
export function parseFinishArgs(
  args: Record<string, unknown>,
  shopName: string,
  shopUrl: string,
): AgentLoopResult {
  const verdict = String(args.verdict ?? "");

  if (verdict === "reject") {
    const shortReason = String(args.short_reason ?? "").trim();
    const longReason = normalizeFootnotes(String(args.long_reason ?? "").trim());
    const markdown = [
      `### Shop-Prüfung: ${shopName}`,
      "",
      `**URL:** ${shopUrl}`,
      "",
      "## Kurzbegründung",
      "",
      shortReason,
      "",
      "## Langbegründung",
      "",
      longReason,
    ].join("\n").trim();

    return { shopName, shopUrl, verdict: "reject", shopJson: null, rejectionMarkdown: markdown };
  }

  if (verdict === "accept") {
    const rawJson = String(args.shop_json ?? "").trim();
    let shopJson: ShopJson | null = null;
    try {
      // Strip markdown code fences if the agent wrapped the JSON
      const cleaned = rawJson.replace(/^```(?:json)?\s*/i, "").replace(/\s*```\s*$/, "");
      shopJson = JSON.parse(cleaned) as ShopJson;
      // Ensure geo exists (may be null if agent couldn't geocode)
      if (!shopJson.geo) shopJson = { ...shopJson, geo: { latitude: null, longitude: null } };
    } catch {
      // JSON parse failed — treat as error
      return { shopName, shopUrl, verdict: "error", shopJson: null, rejectionMarkdown: null };
    }
    return { shopName, shopUrl, verdict: "accept", shopJson, rejectionMarkdown: null };
  }

  return { shopName, shopUrl, verdict: "error", shopJson: null, rejectionMarkdown: null };
}

/**
 * Last-resort parser: tries to extract a result from a plain text assistant message
 * when the agent didn't call finish() explicitly (e.g. max turns exceeded).
 */
export function parseTextFallback(
  text: string,
  shopName: string,
  shopUrl: string,
): AgentLoopResult {
  // Try to extract JSON block for accept
  const jsonMatch = text.match(/```(?:json)?\s*\n([\s\S]*?)\n```/);
  if (jsonMatch) {
    try {
      const shopJson = JSON.parse(jsonMatch[1]) as ShopJson;
      if (shopJson.name && shopJson.url) {
        return { shopName: shopJson.name, shopUrl: shopJson.url, verdict: "accept", shopJson, rejectionMarkdown: null };
      }
    } catch { /* not valid JSON */ }
  }

  // Try to extract rejection markdown
  const shortPlain = text.match(/## Kurzbegründung\s*\n([\s\S]*?)(?=\n## Langbegründung|\n###\s|$)/i);
  const longPlain = text.match(/## Langbegründung\s*\n([\s\S]*?)(?=\n##\s|\n###\s|$)/i);
  if (shortPlain?.[1]?.trim() && longPlain?.[1]?.trim()) {
    return parseFinishArgs(
      { verdict: "reject", short_reason: shortPlain[1].trim(), long_reason: longPlain[1].trim(), shop_json: "" },
      shopName, shopUrl,
    );
  }

  return { shopName, shopUrl, verdict: "error", shopJson: null, rejectionMarkdown: null };
}
