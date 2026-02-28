import { useI18n } from "@/context/I18nContext.tsx";
import {
  useCreateEmailTemplate,
  useEmailTemplate,
  useUpdateEmailTemplate,
} from "@/features/email-templates/hooks/useEmailTemplates.ts";
import type { EmailTemplateInput } from "@lmaa/contracts";
import { Suspense, lazy, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router";
import { SFCheckmarkCircleFill } from "sf-symbols-lib/monochrome";

const LazyRichTextEditor = lazy(() =>
  import("@/features/form-builder/RichTextEditor.tsx").then((m) => ({
    default: m.RichTextEditor,
  })),
);

interface FieldProps {
  label: string;
  required?: boolean;
  hint?: string;
  children: React.ReactNode;
}

function Field({ label, required, hint, children }: FieldProps) {
  return (
    <div className="space-y-1">
      <label className="block text-xs font-medium text-[var(--ds-text-muted)]">
        {label}
        {required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      {children}
      {hint && <p className="text-xs text-[var(--ds-text-muted)]">{hint}</p>}
    </div>
  );
}

function TextInput({
  value,
  onChange,
  placeholder,
  required,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  required?: boolean;
}) {
  return (
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      required={required}
      className="w-full px-3 py-2 text-sm bg-[var(--ds-input-bg)] border border-[var(--ds-border)] rounded-control text-[var(--ds-text)] placeholder:text-[var(--ds-text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent"
    />
  );
}

/**
 * Create/edit page for a single email template.
 * Route: `/email-templates/new` or `/email-templates/:id`
 */
export function EmailTemplateEditPage() {
  const { messages } = useI18n();
  const m = messages.emailTemplates;
  const navigate = useNavigate();
  const { id: idParam } = useParams<{ id?: string }>();
  const isNew = !idParam || idParam === "new";
  const numId = isNew ? 0 : Number(idParam);

  const { data: existing, isLoading } = useEmailTemplate(numId);
  const createMutation = useCreateEmailTemplate();
  const updateMutation = useUpdateEmailTemplate(numId);

  const [name, setName] = useState("");
  const [subject, setSubject] = useState("");
  const [headerBannerUrl, setHeaderBannerUrl] = useState("");
  const [headerText, setHeaderText] = useState("");
  const [bodyText, setBodyText] = useState("");
  const [footerBannerUrl, setFooterBannerUrl] = useState("");
  const [footerText, setFooterText] = useState("");

  const [savedIndicator, setSavedIndicator] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Populate form when loading existing template
  useEffect(() => {
    if (existing) {
      setName(existing.name);
      setSubject(existing.subject);
      setHeaderBannerUrl(existing.headerBannerUrl ?? "");
      setHeaderText(existing.headerText ?? "");
      setBodyText(existing.bodyText);
      setFooterBannerUrl(existing.footerBannerUrl ?? "");
      setFooterText(existing.footerText ?? "");
    }
  }, [existing]);

  function buildPayload(): EmailTemplateInput {
    return {
      name: name.trim(),
      subject: subject.trim(),
      headerBannerUrl: headerBannerUrl.trim() || undefined,
      headerText: headerText || undefined,
      bodyText,
      footerBannerUrl: footerBannerUrl.trim() || undefined,
      footerText: footerText || undefined,
    };
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const payload = buildPayload();

    if (isNew) {
      createMutation.mutate(payload, {
        onSuccess: (created) => {
          void navigate(`/email-templates/${created.id}`, { replace: true });
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
        onError: () => {
          setError(m.saveError);
        },
      });
    }
  }

  const isPending = createMutation.isPending || updateMutation.isPending;

  if (!isNew && isLoading) {
    return (
      <div className="flex items-center justify-center h-64 text-[var(--ds-text-muted)] text-sm">
        {messages.common.loading}
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--ds-border)] shrink-0">
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={() => navigate("/email-templates")}
            className="text-sm text-[var(--ds-text-muted)] hover:text-[var(--ds-text)] transition-colors"
          >
            {m.backToList}
          </button>
          <h1 className="text-base font-semibold text-[var(--ds-text)]">
            {isNew ? m.newTemplate : m.editTemplate}
          </h1>
          {existing?.isSystemTemplate && (
            <span className="px-2 py-0.5 rounded text-xs bg-[var(--ds-surface-hover)] text-[var(--ds-text-muted)]">
              {m.systemBadge}
            </span>
          )}
        </div>
        <div className="flex items-center gap-3">
          {savedIndicator && (
            <span className="flex items-center gap-1 text-xs text-green-600 dark:text-green-400">
              <SFCheckmarkCircleFill className="w-3.5 h-3.5" />
              {m.saved}
            </span>
          )}
          {error && <p className="text-xs text-red-500">{error}</p>}
          <button
            type="submit"
            disabled={isPending}
            className="px-4 py-2 bg-[var(--ds-btn-primary-bg)] text-[var(--ds-btn-primary-fg)] rounded-control text-sm font-medium hover:bg-[var(--ds-btn-primary-hover)] disabled:opacity-60 transition-colors"
          >
            {isPending ? messages.common.saving : m.save}
          </button>
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {/* Name + Subject */}
        <div className="grid grid-cols-2 gap-4">
          <Field label={m.templateName} required>
            <TextInput
              value={name}
              onChange={setName}
              placeholder="welcome-email"
              required
            />
          </Field>
          <Field label={m.templateSubject} required>
            <TextInput
              value={subject}
              onChange={setSubject}
              placeholder="Willkommen bei lmaa.space"
              required
            />
          </Field>
        </div>

        {/* Header */}
        <div className="space-y-4 p-4 rounded-control border border-[var(--ds-border)]">
          <h2 className="text-xs font-semibold text-[var(--ds-text-muted)] uppercase tracking-wide">
            Header
          </h2>
          <Field label={m.headerBanner}>
            <TextInput
              value={headerBannerUrl}
              onChange={setHeaderBannerUrl}
              placeholder="https://example.com/header.png"
            />
          </Field>
          <Field label={m.headerText}>
            <Suspense fallback={<div className="h-24 rounded-control border border-[var(--ds-border)] animate-pulse" />}>
              <LazyRichTextEditor value={headerText} onChange={setHeaderText} rows={4} />
            </Suspense>
          </Field>
        </div>

        {/* Body */}
        <div className="space-y-4 p-4 rounded-control border border-[var(--ds-border)]">
          <h2 className="text-xs font-semibold text-[var(--ds-text-muted)] uppercase tracking-wide">
            Body
          </h2>
          <Field label={m.bodyText} required>
            <Suspense fallback={<div className="h-48 rounded-control border border-[var(--ds-border)] animate-pulse" />}>
              <LazyRichTextEditor value={bodyText} onChange={setBodyText} rows={12} />
            </Suspense>
          </Field>
        </div>

        {/* Footer */}
        <div className="space-y-4 p-4 rounded-control border border-[var(--ds-border)]">
          <h2 className="text-xs font-semibold text-[var(--ds-text-muted)] uppercase tracking-wide">
            Footer
          </h2>
          <Field label={m.footerText}>
            <Suspense fallback={<div className="h-24 rounded-control border border-[var(--ds-border)] animate-pulse" />}>
              <LazyRichTextEditor value={footerText} onChange={setFooterText} rows={4} />
            </Suspense>
          </Field>
          <Field label={m.footerBanner}>
            <TextInput
              value={footerBannerUrl}
              onChange={setFooterBannerUrl}
              placeholder="https://example.com/footer.png"
            />
          </Field>
        </div>
      </div>
    </form>
  );
}
