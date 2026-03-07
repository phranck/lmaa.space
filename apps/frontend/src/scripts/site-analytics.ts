import { normalizeSearchQuery, trackWebsiteEvent } from "@/lib/analytics";

function textContentLabel(element: Element | null): string {
  return element?.textContent?.trim().replace(/\s+/g, " ").slice(0, 120) ?? "";
}

document.addEventListener("submit", (event) => {
  const form = event.target;
  if (!(form instanceof HTMLFormElement)) return;

  const source = form.dataset.analyticsSearchSource;
  if (!source) return;

  const formData = new FormData(form);
  const query = normalizeSearchQuery(formData.get("q"));
  if (!query) return;

  trackWebsiteEvent("site-search", {
    query,
    source,
  });
});

document.addEventListener("click", (event) => {
  const target = event.target;
  if (!(target instanceof Element)) return;

  const link = target.closest<HTMLAnchorElement>("a[data-analytics-event]");
  if (!link) return;

  const eventName = link.dataset.analyticsEvent;
  if (!eventName) return;

  if (eventName === "category-click") {
    trackWebsiteEvent("category-click", {
      categoryId: link.dataset.categoryId ?? "",
      categorySlug: link.dataset.categorySlug ?? "",
      categoryName: link.dataset.categoryName ?? textContentLabel(link),
      source: link.dataset.analyticsSource ?? "",
    });
    return;
  }

  if (eventName === "shop-visit-click") {
    trackWebsiteEvent("shop-visit-click", {
      shopId: link.dataset.shopId ?? "",
      shopName: link.dataset.shopName ?? textContentLabel(link),
      shopDomain: link.dataset.shopDomain ?? "",
      source: link.dataset.analyticsSource ?? "",
    });
    return;
  }

  if (eventName === "site-link-click") {
    trackWebsiteEvent("site-link-click", {
      href: link.dataset.analyticsHref ?? link.getAttribute("href") ?? "",
      label: link.dataset.analyticsLabel ?? textContentLabel(link),
      kind: link.dataset.analyticsKind ?? "",
      placement: link.dataset.analyticsPlacement ?? "",
    });
  }
});
