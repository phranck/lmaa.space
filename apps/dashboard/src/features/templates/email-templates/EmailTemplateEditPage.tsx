import { Card, SectionCard } from "@/components/ui/Card.tsx";
import { MarkdownTextarea } from "@/components/ui/MarkdownTextarea.tsx";
import { PageHeader } from "@/components/ui/PageHeader.tsx";
import { useI18n } from "@/context/I18nContext.tsx";
import { EmailPreview } from "@/features/templates/email-templates/EmailPreview.tsx";
import {
  useCreateEmailTemplate,
  useEmailTemplate,
  useUpdateEmailTemplate,
} from "@/features/templates/hooks/useEmailTemplates.ts";
import type { EmailTemplateInput } from "@lmaa/contracts";
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router";
import { SFExclamationmarkSquareFill } from "sf-symbols-lib/dualtone";
import { SFCheckmarkCircleFill, SFSquareAndArrowDownFill } from "sf-symbols-lib/monochrome";

interface FieldProps {
  label: string;
  htmlFor?: string;
  required?: boolean;
  hint?: string;
  children: React.ReactNode;
}

function Field({ label, htmlFor, required, hint, children }: FieldProps) {
  return (
    <div className="space-y-1">
      <label htmlFor={htmlFor} className="block text-xs font-medium text-[var(--ds-text-muted)]">
        {label}
        {required && (
          <SFExclamationmarkSquareFill className="inline-block ml-1 w-3 h-3 text-red-500 align-middle" />
        )}
      </label>
      {children}
      {hint && <p className="text-xs text-[var(--ds-text-muted)]">{hint}</p>}
    </div>
  );
}

function TextInput({
  id,
  value,
  onChange,
  placeholder,
}: {
  id?: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <input
      id={id}
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
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

  function handleSave() {
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
    <div className="flex flex-col h-full">
      <PageHeader title={name || m.newTemplate}>
        <div className="flex items-center gap-3">
          {savedIndicator && (
            <span className="flex items-center gap-1 text-xs text-green-600 dark:text-green-400">
              <SFCheckmarkCircleFill className="w-3.5 h-3.5" />
              {m.saved}
            </span>
          )}
          {error && <p className="text-xs text-red-500">{error}</p>}
          <button
            type="button"
            onClick={handleSave}
            disabled={isPending}
            className="flex items-center gap-2 h-9 px-4 border border-[var(--ds-btn-primary-border)] text-[var(--ds-btn-primary-text)] rounded-control text-sm font-medium hover:border-[var(--ds-btn-primary-hover-border)] hover:bg-[var(--ds-btn-primary-hover-bg)] disabled:opacity-60 transition-colors"
          >
            <SFSquareAndArrowDownFill className="w-3.5 h-3.5" />
            {isPending ? messages.common.saving : m.save}
          </button>
        </div>
      </PageHeader>

      {/* Sub-bar: back link + inline name input */}
      <div className="px-3 py-1.5 shrink-0 flex items-center gap-3">
        <button
          type="button"
          onClick={() => navigate("/email-templates")}
          className="text-sm text-[var(--ds-text-muted)] hover:text-[var(--ds-text)] transition-colors shrink-0"
        >
          {m.backToList}
        </button>
        <span className="text-[var(--ds-border)]">·</span>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={m.newTemplate}
          className="w-64 px-2 py-1 text-sm font-mono bg-[var(--ds-input-bg)] border border-[var(--ds-border)] rounded text-[var(--ds-text)] placeholder:text-[var(--ds-text-muted)] focus:outline-none focus:ring-1 focus:ring-[var(--color-primary)]"
        />
        {existing?.isSystemTemplate && (
          <span className="px-2 py-0.5 rounded text-xs bg-[var(--ds-surface-hover)] text-[var(--ds-text-muted)]">
            {m.systemBadge}
          </span>
        )}
      </div>

      {/* Body: two-column split — wrapped in a card */}
      <div className="flex-1 overflow-hidden">
        <Card className="h-full flex overflow-hidden">
          {/* Left: form */}
          <div className="w-1/2 overflow-y-auto p-3 space-y-3 border-r border-[var(--ds-border)]">
            {/* Subject */}
            <Field label={m.templateSubject} htmlFor="tpl-subject" required>
              <TextInput
                id="tpl-subject"
                value={subject}
                onChange={setSubject}
                placeholder={m.subjectPlaceholder}
              />
            </Field>

            {/* Header */}
            <SectionCard title={m.sectionHeader}>
              <Field label={m.headerBanner} htmlFor="tpl-header-banner">
                <TextInput
                  id="tpl-header-banner"
                  value={headerBannerUrl}
                  onChange={setHeaderBannerUrl}
                  placeholder="https://example.com/header.png"
                />
              </Field>
              <Field label={m.headerText} htmlFor="tpl-header-text">
                <MarkdownTextarea
                  id="tpl-header-text"
                  value={headerText}
                  onChange={setHeaderText}
                  rows={4}
                />
              </Field>
            </SectionCard>

            {/* Body */}
            <SectionCard title={m.sectionBody}>
              <Field label={m.bodyText} htmlFor="tpl-body-text" required>
                <MarkdownTextarea
                  id="tpl-body-text"
                  value={bodyText}
                  onChange={setBodyText}
                  rows={12}
                />
              </Field>
            </SectionCard>

            {/* Footer */}
            <SectionCard title={m.sectionFooter}>
              <Field label={m.footerText} htmlFor="tpl-footer-text">
                <MarkdownTextarea
                  id="tpl-footer-text"
                  value={footerText}
                  onChange={setFooterText}
                  rows={4}
                />
              </Field>
              <Field label={m.footerBanner} htmlFor="tpl-footer-banner">
                <TextInput
                  id="tpl-footer-banner"
                  value={footerBannerUrl}
                  onChange={setFooterBannerUrl}
                  placeholder="https://example.com/footer.png"
                />
              </Field>
            </SectionCard>
          </div>

          {/* Right: live preview */}
          <div className="w-1/2 overflow-hidden">
            <EmailPreview
              headerBannerUrl={headerBannerUrl}
              headerText={headerText}
              bodyText={bodyText}
              footerBannerUrl={footerBannerUrl}
              footerText={footerText}
            />
          </div>
        </Card>
      </div>
    </div>
  );
}
