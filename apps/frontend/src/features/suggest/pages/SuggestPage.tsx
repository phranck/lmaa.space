import { PageLayout } from "@/components/layout/PageLayout.tsx";
import { useCategories } from "@/features/categories/hooks/useCategories.ts";
import { usePageMeta } from "@/hooks/usePageMeta.ts";
import { api } from "@/lib/api.ts";
import type { ShopCategory } from "@lmaa/shared";
import { EMPTY_SHOP_FORM_VALUE, ShopEditForm } from "@lmaa/ui";
import type { ShopEditFormValue } from "@lmaa/ui";
import { useMutation } from "@tanstack/react-query";
import { type FormEvent, useState } from "react";
import { SFCheckmark } from "sf-symbols-lib/monochrome";
import { Link } from "react-router";

type UrlCheckResult =
  | { exists: false }
  | { exists: true; shop: { id: number; name: string; categories: ShopCategory[] } };

const inputClass =
  "w-full px-3 h-9 border border-[var(--ds-border)] rounded-control text-sm bg-[var(--ds-input-bg)] text-[var(--ds-text)] placeholder:text-[var(--ds-text-subtle)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]";

export function SuggestPage() {
  usePageMeta({
    title: "Shop vorschlagen",
    description:
      "Kennst du einen fairen Online-Shop? Schlage ihn für lmaa.space vor und hilf der Community.",
    canonicalPath: "/suggestion",
  });

  const { data: categories = [] } = useCategories();
  const [submitted, setSubmitted] = useState(false);
  const [shopForm, setShopForm] = useState<ShopEditFormValue>(EMPTY_SHOP_FORM_VALUE);
  const [shopErrors, setShopErrors] = useState<Partial<Record<keyof ShopEditFormValue, string>>>(
    {},
  );
  const [submitterEmail, setSubmitterEmail] = useState("");
  const [emailError, setEmailError] = useState("");
  const [urlCheck, setUrlCheck] = useState<UrlCheckResult | null>(null);
  const [urlChecking, setUrlChecking] = useState(false);

  const mutation = useMutation({
    mutationFn: (data: ShopEditFormValue & { submitterEmail?: string }) =>
      api.post("/submissions", {
        shopName: data.name,
        shopUrl: data.url,
        categoryIds: data.categoryIds,
        description: data.description || undefined,
        region: data.region,
        shipping: data.shipping || undefined,
        submitterEmail: data.submitterEmail || undefined,
      }),
    onSuccess: () => setSubmitted(true),
  });

  async function checkUrl(url: string) {
    if (!url || !url.startsWith("http")) return;
    setUrlChecking(true);
    try {
      const result = await api.get<UrlCheckResult>(`/check-url?url=${encodeURIComponent(url)}`);
      setUrlCheck(result);
    } catch {
      setUrlCheck(null);
    } finally {
      setUrlChecking(false);
    }
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();

    const errors: typeof shopErrors = {};
    if (!shopForm.name.trim()) errors.name = "Bitte einen Shop-Namen eingeben";
    if (!shopForm.url.trim() || !shopForm.url.startsWith("http"))
      errors.url = "Bitte eine gültige URL eingeben (https://...)";
    if (shopForm.categoryIds.length === 0)
      errors.categoryIds = "Bitte mindestens eine Kategorie wählen";

    if (Object.keys(errors).length > 0) {
      setShopErrors(errors);
      return;
    }
    setShopErrors({});

    if (submitterEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(submitterEmail)) {
      setEmailError("Ungültige E-Mail-Adresse");
      return;
    }
    setEmailError("");

    mutation.mutate({ ...shopForm, submitterEmail });
  }

  const urlWarning = (
    <>
      {urlChecking && (
        <p className="text-[var(--ds-text-subtle)] text-xs mt-1.5">Prüfe ob Shop bereits bekannt…</p>
      )}
      {!urlChecking && urlCheck?.exists && (
        <div className="mt-2 px-3 py-2.5 bg-[var(--ds-warning-bg)] border border-[var(--ds-warning-text)]/25 rounded-control text-sm text-[var(--ds-warning-text)]">
          <span className="font-medium">{urlCheck.shop.name}</span> ist bereits in unserer Liste
          {urlCheck.shop.categories.length > 0 && (
            <span>
              {" "}
              in{" "}
              {urlCheck.shop.categories.map((c, i) => (
                <span key={c.id}>
                  {i > 0 && ", "}
                  <span className="font-medium">{c.name}</span>
                </span>
              ))}
            </span>
          )}
          .
        </div>
      )}
    </>
  );

  const descriptionHint = (
    <div className="flex justify-between items-start mt-1.5 gap-4">
      <p className="text-xs text-[var(--ds-text-subtle)] leading-relaxed">
        Optional – aber eine gute Beschreibung hilft anderen, den Shop schneller einzuschätzen.
      </p>
      <span className="text-xs text-[var(--ds-text-subtle)] shrink-0">{shopForm.description.length}/500</span>
    </div>
  );

  if (submitted) {
    return (
      <PageLayout>
        <div className="max-w-lg mx-auto px-4 py-24 text-center">
          <div className="w-16 h-16 rounded-full bg-[var(--ds-accent-subtle)] flex items-center justify-center mx-auto mb-6">
            <SFCheckmark size={32} className="text-[var(--ds-accent)]" aria-hidden="true" />
          </div>
          <h1 className="font-serif text-2xl font-semibold text-[var(--ds-text)] mb-3">
            Vielen Dank für deinen Vorschlag!
          </h1>
          <p className="text-[var(--ds-text-muted)] mb-10 leading-relaxed">
            Wir prüfen ihn und nehmen ihn bei Eignung in die Liste auf.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              to="/"
              className="inline-flex items-center justify-center h-9 px-6 bg-[var(--ds-btn-filled-bg)] text-[var(--ds-btn-filled-fg)] rounded-control text-sm font-medium hover:bg-[var(--ds-btn-filled-hover)] transition-colors"
            >
              Zur Startseite
            </Link>
            <button
              type="button"
              onClick={() => {
                setSubmitted(false);
                setShopForm(EMPTY_SHOP_FORM_VALUE);
                setSubmitterEmail("");
              }}
              className="h-9 px-6 border border-[var(--ds-btn-neutral-border)] text-[var(--ds-btn-neutral-text)] rounded-control text-sm font-medium hover:border-[var(--ds-btn-neutral-hover-border)] transition-colors"
            >
              Weiteren Shop vorschlagen
            </button>
          </div>
          <p className="mt-10 text-sm text-[var(--ds-text-subtle)]">
            Dir gefällt lmaa.space?{" "}
            <a
              href="https://ko-fi.com/layeredwork?ref=lmaa.space"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[var(--ds-accent)] hover:underline"
            >
              Unterstütze das Projekt!
            </a>
          </p>
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout>
      <div className="max-w-lg mx-auto px-4 sm:px-6 py-12">
        <div className="mb-10">
          <h1 className="font-serif text-3xl font-semibold text-[var(--ds-text)] mb-2">
            Shop vorschlagen
          </h1>
          <p className="text-[var(--ds-text-muted)] text-sm leading-relaxed">
            Hilf mit, die Liste zu erweitern. Dein Vorschlag wird geprüft und bei Eignung
            aufgenommen.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <ShopEditForm
            value={shopForm}
            onChange={setShopForm}
            categories={categories}
            errors={shopErrors}
            variant="frontend"
            onUrlBlur={checkUrl}
            urlWarning={urlWarning}
            descriptionHint={descriptionHint}
          />

          <div>
            <label
              htmlFor="submitterEmail"
              className="block text-sm font-medium text-[var(--ds-text)] mb-1.5"
            >
              Deine E-Mail <span className="text-[var(--ds-text-subtle)] font-normal">(optional)</span>
            </label>
            <input
              id="submitterEmail"
              type="email"
              value={submitterEmail}
              onChange={(e) => setSubmitterEmail(e.target.value)}
              placeholder="fuer@rueckfragen.de"
              className={inputClass}
            />
            <p className="text-xs text-[var(--ds-text-subtle)] mt-1.5">
              Nur für Rückfragen und Benachrichtigung bei Aufnahme.
            </p>
            {emailError && <p className="text-[var(--ds-danger-text)] text-xs mt-1">{emailError}</p>}
          </div>

          {mutation.isError && (
            <p className="text-[var(--ds-danger-text)] text-sm text-center">
              Fehler beim Absenden. Bitte versuche es erneut.
            </p>
          )}

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={mutation.isPending}
              className="h-9 px-6 bg-[var(--ds-btn-filled-bg)] text-[var(--ds-btn-filled-fg)] rounded-control font-medium text-sm hover:bg-[var(--ds-btn-filled-hover)] transition-colors disabled:opacity-60"
            >
              {mutation.isPending ? "Wird gesendet…" : "Vorschlag absenden"}
            </button>
          </div>
        </form>
      </div>
    </PageLayout>
  );
}
