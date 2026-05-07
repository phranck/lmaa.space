import { CheckCircleIcon, DownloadIcon, SealWarningIcon } from "@phosphor-icons/react";
import { Suspense, lazy, useState } from "react";
import { useNavigate, useParams } from "react-router";

import type { EmailTemplateInput } from "@lmaa/contracts";

const MarkdownEditor = lazy(() =>
  import("@lmaa/ui").then((m) => ({ default: m.MarkdownEditor })),
);

import { Card, SectionCard } from "@/components/ui/Card.tsx";
import { HeaderBackButton } from "@/components/ui/HeaderBackButton.tsx";
import { PageHeader } from "@/components/ui/PageHeader.tsx";
import {
  SystemTemplateBadge,
  SystemTemplateCheckbox,
} from "@/components/ui/SystemTemplateBadge.tsx";
import { useI18n } from "@/context/I18nContext.tsx";
import { useAuth } from "@/features/auth/AuthContext.tsx";
import { EmailPreview } from "@/features/templates/email-templates/EmailPreview.tsx";
import {
  useCreateEmailTemplate,
  useEmailTemplate,
  useUpdateEmailTemplate,
} from "@/features/templates/hooks/useEmailTemplates.ts";
import { useKeyboardSave } from "@/lib/hooks/useKeyboardSave.ts";

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
          <SealWarningIcon
            weight="duotone"
            className="inline-block ml-1 w-3 h-3 text-red-500 align-middle"
          />
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
      className="w-full px-3 py-1.5 text-sm bg-[var(--ds-input-bg)] border border-[var(--ds-border)] rounded-control text-[var(--ds-text)] placeholder:text-[var(--ds-text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent"
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
  const { user } = useAuth();
  const isOwner = Boolean(user?.isOwner);
  const { id: idParam } = useParams<{ id?: string }>();
  const isNew = !idParam || idParam === "new";
  const numId = isNew ? 0 : Number(idParam);

  const { data: existing, isLoading } = useEmailTemplate(numId);
  const createMutation = useCreateEmailTemplate();
  const updateMutation = useUpdateEmailTemplate(numId);

  interface TemplateFormFields {
    name: string;
    subject: string;
    headerBannerUrl: string;
    headerText: string;
    bodyText: string;
    footerBannerUrl: string;
    footerText: string;
    isSystemTemplate: boolean;
  }

  const [form, setForm] = useState<TemplateFormFields>({
    name: "",
    subject: "",
    headerBannerUrl: "",
    headerText: "",
    bodyText: "",
    footerBannerUrl: "",
    footerText: "",
    isSystemTemplate: false,
  });
  const { name, subject, headerBannerUrl, headerText, bodyText, footerBannerUrl, footerText } = form;

  const updateField = <K extends keyof TemplateFormFields>(key: K, value: TemplateFormFields[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const [savedIndicator, setSavedIndicator] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Populate form when existing template data arrives (adjust-state-during-render pattern)
  const [syncedExistingId, setSyncedExistingId] = useState<number | undefined>();
  if (existing && existing.id !== syncedExistingId) {
    setSyncedExistingId(existing.id);
    setForm({
      name: existing.name,
      subject: existing.subject,
      headerBannerUrl: existing.headerBannerUrl ?? "",
      headerText: existing.headerText ?? "",
      bodyText: existing.bodyText,
      footerBannerUrl: existing.footerBannerUrl ?? "",
      footerText: existing.footerText ?? "",
      isSystemTemplate: existing.isSystemTemplate,
    });
  }

  function buildPayload(): EmailTemplateInput {
    return {
      name: name.trim(),
      subject: subject.trim(),
      headerBannerUrl: headerBannerUrl.trim() || undefined,
      headerText: headerText || undefined,
      bodyText,
      footerBannerUrl: footerBannerUrl.trim() || undefined,
      footerText: footerText || undefined,
      isSystemTemplate: isOwner ? form.isSystemTemplate : undefined,
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

  useKeyboardSave(handleSave, !isPending);

  if (!isNew && isLoading) {
    return (
      <div className="flex items-center justify-center h-64 text-[var(--ds-text-muted)] text-sm">
        {messages.common.loading}
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <PageHeader
        title={name || m.newTemplate}
        leading={<HeaderBackButton label={messages.emailTemplates.listTitle} onClick={() => navigate("/email-templates")} />}
      >
        <div className="flex items-center gap-3">
          {savedIndicator && (
            <span className="flex items-center gap-1 text-xs text-green-600 dark:text-green-400">
              <CheckCircleIcon weight="duotone" className="w-3.5 h-3.5" />
              {m.saved}
            </span>
          )}
          {error && <p className="text-xs text-red-500">{error}</p>}
          <button
            type="button"
            onClick={handleSave}
            disabled={isPending}
            className="flex items-center gap-2 h-9 px-4 border border-[var(--ds-btn-primary-border)] text-[var(--ds-btn-primary-text)] rounded-control text-sm font-medium hover:border-[var(--ds-btn-primary-hover-border)] hover:bg-[var(--ds-btn-primary-hover-bg)] disabled:opacity-60"
          >
            <DownloadIcon weight="duotone" className="w-3.5 h-3.5" />
            {isPending ? messages.common.saving : m.save}
          </button>
        </div>
      </PageHeader>

      {/* Sub-bar: back link + inline name input */}
      <div className="px-3 py-1.5 shrink-0 flex items-center gap-3">
        <button
          type="button"
          onClick={() => navigate("/email-templates")}
          className="text-sm text-[var(--ds-text-muted)] hover:text-[var(--ds-text)] shrink-0"
        >
          {m.backToList}
        </button>
        <span className="text-[var(--ds-border)]">·</span>
        <input
          type="text"
          value={name}
          onChange={(e) => updateField("name", e.target.value)}
          placeholder={m.newTemplate}
          className="w-64 px-2 py-1 text-sm font-mono bg-[var(--ds-input-bg)] border border-[var(--ds-border)] rounded text-[var(--ds-text)] placeholder:text-[var(--ds-text-muted)] focus:outline-none focus:ring-1 focus:ring-[var(--color-primary)]"
        />
        {form.isSystemTemplate && !isOwner && <SystemTemplateBadge label={m.systemBadge} />}
        {isOwner && (
          <SystemTemplateCheckbox
            checked={form.isSystemTemplate}
            onChange={(value) => updateField("isSystemTemplate", value)}
            label={m.systemCheckbox}
            hint={m.systemHint}
          />
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
                onChange={(v) => updateField("subject", v)}
                placeholder={m.subjectPlaceholder}
              />
            </Field>

            {/* Header */}
            <SectionCard title={m.sectionHeader}>
              <Field label={m.headerBanner} htmlFor="tpl-header-banner">
                <TextInput
                  id="tpl-header-banner"
                  value={headerBannerUrl}
                  onChange={(v) => updateField("headerBannerUrl", v)}
                  placeholder="https://example.com/header.png"
                />
              </Field>
              <Field label={m.headerText} htmlFor="tpl-header-text">
                <Suspense fallback={<div className="h-[6rem] rounded-control border border-[var(--ds-border)] bg-[var(--ds-input-bg)] animate-pulse" />}>
                  <MarkdownEditor
                    id="tpl-header-text"
                    value={headerText}
                    onChange={(v) => updateField("headerText", v)}
                    rows={4}
                  />
                </Suspense>
              </Field>
            </SectionCard>

            {/* Body */}
            <SectionCard title={m.sectionBody}>
              <Field label={m.bodyText} htmlFor="tpl-body-text" required>
                <Suspense fallback={<div className="h-[18rem] rounded-control border border-[var(--ds-border)] bg-[var(--ds-input-bg)] animate-pulse" />}>
                  <MarkdownEditor
                    id="tpl-body-text"
                    value={bodyText}
                    onChange={(v) => updateField("bodyText", v)}
                    rows={12}
                  />
                </Suspense>
              </Field>
            </SectionCard>

            {/* Footer */}
            <SectionCard title={m.sectionFooter}>
              <Field label={m.footerText} htmlFor="tpl-footer-text">
                <Suspense fallback={<div className="h-[6rem] rounded-control border border-[var(--ds-border)] bg-[var(--ds-input-bg)] animate-pulse" />}>
                  <MarkdownEditor
                    id="tpl-footer-text"
                    value={footerText}
                    onChange={(v) => updateField("footerText", v)}
                    rows={4}
                  />
                </Suspense>
              </Field>
              <Field label={m.footerBanner} htmlFor="tpl-footer-banner">
                <TextInput
                  id="tpl-footer-banner"
                  value={footerBannerUrl}
                  onChange={(v) => updateField("footerBannerUrl", v)}
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
