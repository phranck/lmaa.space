import {
  CheckCircleIcon,
  DownloadIcon,
  MastodonLogoIcon,
  SealWarningIcon,
} from "@phosphor-icons/react";
import { Suspense, lazy, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router";

import { MASTODON_POST_TEMPLATE_VARIABLES, type MastodonPostTemplateInput } from "@lmaa/contracts";

const MarkdownEditor = lazy(() => import("@lmaa/ui").then((m) => ({ default: m.MarkdownEditor })));

import { Card } from "@/components/ui/Card.tsx";
import { HeaderBackButton } from "@/components/ui/HeaderBackButton.tsx";
import { PageHeader } from "@/components/ui/PageHeader.tsx";
import { useI18n } from "@/context/I18nContext.tsx";
import {
  useCreateMastodonPostTemplate,
  useMastodonPostTemplate,
  useUpdateMastodonPostTemplate,
} from "@/features/templates/hooks/useMastodonPostTemplates.ts";
import { useKeyboardSave } from "@/lib/hooks/useKeyboardSave.ts";

function renderPreview(template: string) {
  return template.replace(/\{\{(\w+)\}\}/g, (_, name) => {
    const examples: Record<string, string> = {
      shopName: "Good Karma Coffee",
      shopUrl: "https://goodkarma.example",
      shopDescription: "Fair produzierte Spezialitäten aus kleiner Rösterei.",
      shopRegion: "DE, AT",
      shopShipping: "EU",
      shopPickup: "Berlin",
      shopContactEmail: "hello@goodkarma.example",
      shopCategories: "Kaffee, Feinkost",
      shopPageUrl: "https://lmaa.space/shop/abc12345",
      adminNote: "Neu im Verzeichnis.",
      frontendUrl: "https://lmaa.space",
      dashboardUrl: "https://admin.lmaa.space",
    };
    return examples[name] ?? "";
  });
}

export function MastodonPostTemplateEditPage() {
  const { messages } = useI18n();
  const m = messages.mastodonTemplates;
  const navigate = useNavigate();
  const { id: idParam } = useParams<{ id?: string }>();
  const isNew = !idParam || idParam === "new";
  const numId = isNew ? 0 : Number(idParam);
  const { data: existing, isLoading } = useMastodonPostTemplate(numId);
  const createMutation = useCreateMastodonPostTemplate();
  const updateMutation = useUpdateMastodonPostTemplate(numId);
  const [form, setForm] = useState<MastodonPostTemplateInput>({ name: "", bodyText: "" });
  const [syncedExistingId, setSyncedExistingId] = useState<number | undefined>();
  const [savedIndicator, setSavedIndicator] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (existing && existing.id !== syncedExistingId) {
    setSyncedExistingId(existing.id);
    setForm({ name: existing.name, bodyText: existing.bodyText });
  }

  const preview = useMemo(() => renderPreview(form.bodyText), [form.bodyText]);

  function handleSave() {
    setError(null);
    const payload = {
      name: form.name.trim(),
      bodyText: form.bodyText,
    };

    if (isNew) {
      createMutation.mutate(payload, {
        onSuccess: (created) => {
          void navigate(`/mastodon-post-templates/${created.id}`, { replace: true });
        },
        onError: (err: unknown) => {
          const status =
            err && typeof err === "object" && "status" in err
              ? (err as { status: number }).status
              : 0;
          setError(status === 409 ? m.nameConflict : m.saveError);
        },
      });
    } else {
      updateMutation.mutate(payload, {
        onSuccess: () => {
          setSavedIndicator(true);
          setTimeout(() => setSavedIndicator(false), 2000);
        },
        onError: () => setError(m.saveError),
      });
    }
  }

  const isPending = createMutation.isPending || updateMutation.isPending;
  useKeyboardSave(handleSave, !isPending);

  if (!isNew && isLoading) {
    return (
      <div className="flex h-64 items-center justify-center text-sm text-[var(--ds-text-muted)]">
        {messages.common.loading}
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      <PageHeader
        title={form.name || m.newTemplate}
        leading={
          <HeaderBackButton
            label={m.listTitle}
            onClick={() => navigate("/mastodon-post-templates")}
          />
        }
      >
        <div className="flex items-center gap-3">
          {savedIndicator && (
            <span className="flex items-center gap-1 text-xs text-green-600 dark:text-green-400">
              <CheckCircleIcon weight="duotone" className="h-3.5 w-3.5" />
              {m.saved}
            </span>
          )}
          {error && <p className="text-xs text-red-500">{error}</p>}
          <button
            type="button"
            onClick={handleSave}
            disabled={isPending}
            className="flex h-9 items-center gap-2 rounded-control border border-[var(--ds-btn-primary-border)] px-4 text-sm font-medium text-[var(--ds-btn-primary-text)] hover:border-[var(--ds-btn-primary-hover-border)] hover:bg-[var(--ds-btn-primary-hover-bg)] disabled:opacity-60"
          >
            <DownloadIcon weight="duotone" className="h-3.5 w-3.5" />
            {isPending ? messages.common.saving : m.save}
          </button>
        </div>
      </PageHeader>

      <div className="flex shrink-0 items-center gap-3 px-3 py-1.5">
        <button
          type="button"
          onClick={() => navigate("/mastodon-post-templates")}
          className="shrink-0 text-sm text-[var(--ds-text-muted)] hover:text-[var(--ds-text)]"
        >
          {m.backToList}
        </button>
        <span className="text-[var(--ds-border)]">·</span>
        <input
          type="text"
          value={form.name}
          onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
          placeholder={m.newTemplate}
          className="w-64 rounded border border-[var(--ds-border)] bg-[var(--ds-input-bg)] px-2 py-1 font-mono text-sm text-[var(--ds-text)] placeholder:text-[var(--ds-text-muted)] focus:outline-none focus:ring-1 focus:ring-[var(--color-primary)]"
        />
      </div>

      <div className="flex-1 overflow-hidden">
        <Card className="grid h-full grid-cols-1 overflow-hidden xl:grid-cols-[minmax(0,1fr)_24rem]">
          <div className="min-w-0 overflow-y-auto border-r border-[var(--ds-border)] p-3">
            <label className="space-y-1">
              <span className="block text-xs font-medium text-[var(--ds-text-muted)]">
                {m.bodyText}
                <SealWarningIcon
                  weight="duotone"
                  className="ml-1 inline-block h-3 w-3 align-middle text-red-500"
                />
              </span>
              <Suspense
                fallback={
                  <div className="h-[24rem] animate-pulse rounded-control border border-[var(--ds-border)] bg-[var(--ds-input-bg)]" />
                }
              >
                <MarkdownEditor
                  id="mastodon-post-body"
                  value={form.bodyText}
                  onChange={(bodyText) => setForm((current) => ({ ...current, bodyText }))}
                  rows={18}
                  resizable
                />
              </Suspense>
            </label>

            <section className="mt-4 rounded-control border border-[var(--ds-border)] p-4">
              <h2 className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase text-[var(--ds-text-muted)]">
                <MastodonLogoIcon weight="duotone" className="h-3.5 w-3.5" />
                {m.previewTitle}
              </h2>
              <pre className="whitespace-pre-wrap break-words rounded-control bg-[var(--ds-bg-elevated)] p-3 text-sm leading-relaxed text-[var(--ds-text)]">
                {preview || m.emptyPreview}
              </pre>
            </section>
          </div>

          <aside className="overflow-y-auto p-4">
            <h2 className="text-sm font-semibold text-[var(--ds-text)]">{m.variablesTitle}</h2>
            <p className="mt-1 text-xs leading-relaxed text-[var(--ds-text-muted)]">
              {m.variablesHint}
            </p>
            <dl className="mt-4 space-y-3">
              {MASTODON_POST_TEMPLATE_VARIABLES.map((variable) => (
                <div
                  key={variable}
                  className="rounded-control border border-[var(--ds-border)] p-3"
                >
                  <dt className="font-mono text-xs font-semibold text-[var(--ds-text)]">
                    {"{{"}
                    {variable}
                    {"}}"}
                  </dt>
                  <dd className="mt-1 text-xs leading-relaxed text-[var(--ds-text-muted)]">
                    {m.variables[variable]}
                  </dd>
                </div>
              ))}
            </dl>
          </aside>
        </Card>
      </div>
    </div>
  );
}
