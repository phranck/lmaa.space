import type { Category, ShopCategory } from "@lmaa/shared";
import { EMPTY_SHOP_FORM_VALUE, ShopEditForm } from "@lmaa/ui";
import type { ShopEditFormValue } from "@lmaa/ui";
import type React from "react";
import { useState } from "react";

interface Props {
  categories: Category[];
}

interface SubmissionRequestError extends Error {
  status?: number;
  responseMessage?: string | null;
}

type UrlCheckResult =
  | { exists: false }
  | { exists: true; shop: { id: number; name: string; categories: ShopCategory[] } };

import { API_BASE } from "@/lib/client-api";

const inputClass =
  "w-full px-3 h-9 border border-[var(--ds-border)] rounded-control text-sm bg-[var(--ds-input-bg)] text-[var(--ds-text)] placeholder:text-[var(--ds-text-subtle)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]";

function extractApiErrorMessage(payload: unknown): string | null {
  if (!payload || typeof payload !== "object") return null;

  const error = "error" in payload ? (payload as { error?: unknown }).error : undefined;
  if (error && typeof error === "object" && "message" in error) {
    const message = (error as { message?: unknown }).message;
    return typeof message === "string" ? message : null;
  }

  const message = "message" in payload ? (payload as { message?: unknown }).message : undefined;
  return typeof message === "string" ? message : null;
}

function getSubmissionErrorMessage(error: unknown): string {
  if (error instanceof TypeError) {
    return "Verbindung zum Server fehlgeschlagen. Bitte prüfe deine Verbindung.";
  }

  const typedError = error as SubmissionRequestError;
  const status = typedError.status;

  if (status === 429) {
    return "Zu viele Vorschläge von deiner Verbindung. Bitte versuche es später erneut.";
  }

  if (status === 400) {
    return typedError.responseMessage || "Bitte prüfe deine Eingaben und versuche es erneut.";
  }

  if (status && status >= 500) {
    return "Serverfehler beim Absenden. Bitte versuche es später erneut.";
  }

  if (typedError.responseMessage) return typedError.responseMessage;

  return "Fehler beim Absenden. Bitte versuche es erneut.";
}

function useSuggestFormState() {
  const [submitted, setSubmitted] = useState(false);
  const [shopForm, setShopForm] = useState<ShopEditFormValue>(EMPTY_SHOP_FORM_VALUE);
  const [shopErrors, setShopErrors] = useState<Partial<Record<keyof ShopEditFormValue, string>>>(
    {},
  );
  const [submitterEmail, setSubmitterEmail] = useState("");
  const [emailError, setEmailError] = useState("");
  const [urlCheck, setUrlCheck] = useState<UrlCheckResult | null>(null);
  const [urlChecking, setUrlChecking] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  return {
    submitted,
    setSubmitted,
    shopForm,
    setShopForm,
    shopErrors,
    setShopErrors,
    submitterEmail,
    setSubmitterEmail,
    emailError,
    setEmailError,
    urlCheck,
    setUrlCheck,
    urlChecking,
    setUrlChecking,
    submitting,
    setSubmitting,
    submitError,
    setSubmitError,
  };
}

export default function SuggestForm({ categories }: Props) {
  const {
    submitted,
    setSubmitted,
    shopForm,
    setShopForm,
    shopErrors,
    setShopErrors,
    submitterEmail,
    setSubmitterEmail,
    emailError,
    setEmailError,
    urlCheck,
    setUrlCheck,
    urlChecking,
    setUrlChecking,
    submitting,
    setSubmitting,
    submitError,
    setSubmitError,
  } = useSuggestFormState();

  async function checkUrl(url: string) {
    if (!url || !url.startsWith("http")) return;
    setUrlChecking(true);
    try {
      const res = await fetch(`${API_BASE}/check-url?url=${encodeURIComponent(url)}`);
      const json = await res.json();
      setUrlCheck(json.data as UrlCheckResult);
    } catch {
      setUrlCheck(null);
    } finally {
      setUrlChecking(false);
    }
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
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
    setSubmitError(null);
    setSubmitting(true);

    try {
      const res = await fetch(`${API_BASE}/submissions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          shopName: shopForm.name,
          shopUrl: shopForm.url,
          categoryIds: shopForm.categoryIds,
          description: shopForm.description || undefined,
          region: shopForm.region,
          shipping: shopForm.shipping || undefined,
          submitterEmail: submitterEmail || undefined,
        }),
      });
      if (!res.ok) {
        const payload = await res.json().catch(() => null);
        const apiMessage = extractApiErrorMessage(payload);
        const requestError = new Error("Submission request failed") as SubmissionRequestError;
        requestError.status = res.status;
        requestError.responseMessage = apiMessage;
        throw requestError;
      }
      setSubmitted(true);
    } catch (error) {
      setSubmitError(getSubmissionErrorMessage(error));
    } finally {
      setSubmitting(false);
    }
  }

  const urlWarning = (
    <>
      {urlChecking && (
        <p className="text-[var(--ds-text-subtle)] text-xs mt-1.5">
          Prüfe ob Shop bereits bekannt…
        </p>
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
        Eine gute Beschreibung hilft anderen, den Shop schneller einzuschätzen.
      </p>
      <span className="text-xs text-[var(--ds-text-subtle)] shrink-0">
        {shopForm.description.length}/500
      </span>
    </div>
  );

  if (submitted) {
    return (
      <div className="max-w-lg mx-auto px-4 py-24 text-center">
        <div className="w-16 h-16 rounded-full bg-[var(--ds-accent-subtle)] flex items-center justify-center mx-auto mb-6">
          <svg
            width="32"
            height="32"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-[var(--ds-accent)]"
            aria-hidden
          >
            <title>Erfolgreich gesendet</title>
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </div>
        <h1 className="font-serif text-2xl font-semibold text-[var(--ds-text)] mb-3">
          Vielen Dank für deinen Vorschlag!
        </h1>
        <p className="text-[var(--ds-text-muted)] mb-10 leading-relaxed">
          Wir prüfen ihn und nehmen ihn bei Eignung in die Liste auf.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <a
            href="/"
            className="inline-flex items-center justify-center h-9 px-6 bg-[var(--ds-btn-filled-bg)] text-[var(--ds-btn-filled-fg)] rounded-control text-sm font-medium hover:bg-[var(--ds-btn-filled-hover)] transition-colors"
          >
            Zur Startseite
          </a>
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
    );
  }

  return (
    <div className="max-w-lg mx-auto px-4 sm:px-6 py-12">
      <div className="mb-8">
        <h1 className="font-serif text-3xl font-semibold text-[var(--ds-text)] mb-2">
          Shop vorschlagen
        </h1>
        <p className="text-[var(--ds-text-muted)] text-sm leading-relaxed">
          Hilf mit, die Liste zu erweitern. Dein Vorschlag wird geprüft und bei Eignung aufgenommen.
        </p>
      </div>

      <div className="bg-amber-50 border border-amber-200 rounded-xl px-5 py-4 mb-8 text-sm leading-relaxed">
        <p className="font-medium text-amber-900 mb-2">
          Danke, dass du dir die Zeit nimmst, einen Shop einzutragen.
        </p>
        <p className="text-amber-800 mb-3">
          Doch bevor du das tust, denk kurz an die{" "}
          <a
            href="/admissioncriteria"
            className="underline underline-offset-2 hover:text-amber-900 transition-colors"
          >
            Aufnahmekriterien
          </a>
          :
        </p>
        <ul className="text-amber-800 space-y-1 mb-3 pl-4 list-disc">
          <li>
            Ist es ein Online-Shop <em>mit Ladengeschäft</em> in deiner Gegend?
          </li>
          <li>Kennst du diesen Laden persönlich?</li>
          <li>Willst du ihn aus Überzeugung unterstützen, weil er es „verdient" hat?</li>
        </ul>
        <p className="text-amber-800">
          Wenn du all das mit „Ja" beantworten kannst: dann weiter. Trag ihn ein. Anderenfalls würde
          ich dir davon abraten.
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
            Deine E-Mail{" "}
            <span className="text-[var(--ds-text-subtle)] font-normal">(optional)</span>
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

        {submitError && (
          <p className="text-[var(--ds-danger-text)] text-sm text-center">{submitError}</p>
        )}

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={submitting}
            className="h-9 px-6 bg-[var(--ds-btn-filled-bg)] text-[var(--ds-btn-filled-fg)] rounded-control font-medium text-sm hover:bg-[var(--ds-btn-filled-hover)] transition-colors disabled:opacity-60"
          >
            {submitting ? "Wird gesendet…" : "Vorschlag absenden"}
          </button>
        </div>
      </form>
    </div>
  );
}
