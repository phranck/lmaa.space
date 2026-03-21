import { SHOPCHECK_USER_AGENT } from "../constants";
import { crawlRelevantPages } from "./research";
import { extractFacts } from "./extract";
import { fetchAdmissionCriteria } from "./criteria";
import { loadCategoriesCached } from "./categories";
import { runShopCheckAgent } from "./agent";
import type { ShopJson } from "./output";

export type DeterministicRunnerResult = {
  shopName: string;
  shopUrl: string;
  verdict: "accept" | "reject" | "error";
  shopJson: ShopJson | null;
  rejectionMarkdown: string | null;
};

export async function runDeterministicOllamaFlow({
  shopUrl,
  shopName,
  onProgress,
}: {
  shopUrl: string;
  shopName: string;
  onProgress?: (message: string) => void;
}): Promise<DeterministicRunnerResult> {
  onProgress?.(`[deterministic] Crawling relevant shop pages via Crawl4AI...`);
  const pages = await crawlRelevantPages({
    shopUrl,
    onProgress: (message) => onProgress?.(`[deterministic] ${message}`),
  });

  if (pages.length === 0) {
    onProgress?.(`[deterministic] No crawlable shop pages returned content.`);
    return {
      shopName,
      shopUrl,
      verdict: "error",
      shopJson: null,
      rejectionMarkdown: null,
    };
  }

  onProgress?.(`[deterministic] Extracting deterministic facts from ${pages.length} pages...`);
  const facts = extractFacts(pages);

  onProgress?.(`[deterministic] Loading admission criteria and categories...`);
  const [admissionCriteriaText, categories] = await Promise.all([
    fetchAdmissionCriteria(SHOPCHECK_USER_AGENT),
    loadCategoriesCached(SHOPCHECK_USER_AGENT),
  ]);

  onProgress?.(`[deterministic] Running structured shop evaluation...`);
  const result = await runShopCheckAgent({
    shopUrl,
    shopName,
    preCrawledPages: pages,
    preCrawledFacts: facts,
    admissionCriteriaText,
    categories,
    onProgress: (message) => onProgress?.(`[deterministic] ${message}`),
  });

  return {
    shopName: result.shopName,
    shopUrl: result.shopUrl,
    verdict: result.verdict,
    shopJson: result.shopJson,
    rejectionMarkdown: result.rejectionMarkdown?.markdown ?? result.fullResponse ?? null,
  };
}
