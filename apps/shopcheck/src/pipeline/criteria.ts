const ADMISSION_CRITERIA_URL = "https://lmaa.space/admissioncriteria";
const TIMEOUT_MS = 15000;

function stripHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export async function fetchAdmissionCriteria(userAgent: string): Promise<string> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(ADMISSION_CRITERIA_URL, {
      signal: controller.signal,
      headers: { "user-agent": userAgent, accept: "text/html,application/xhtml+xml" },
    });
    if (!res.ok) return "";
    const html = await res.text();
    return stripHtml(html).slice(0, 8000);
  } catch {
    return "";
  } finally {
    clearTimeout(timer);
  }
}

