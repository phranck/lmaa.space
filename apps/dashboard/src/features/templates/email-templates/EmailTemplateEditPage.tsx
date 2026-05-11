import {
  ArticleIcon,
  CheckCircleIcon,
  EnvelopeOpenIcon,
  EnvelopeSimpleIcon,
  SealWarningIcon,
  SquareHalfBottomIcon,
} from "@phosphor-icons/react";
import { Suspense, lazy, type ReactNode, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router";

import type { EmailTemplateInput } from "@lmaa/contracts";
import { DashboardSection } from "@lmaa/ui";

const MarkdownEditor = lazy(() => import("@lmaa/ui").then((m) => ({ default: m.MarkdownEditor })));

import { SaveActionButton } from "@/components/ui/DashboardActionButton.tsx";
import { DashboardInput } from "@/components/ui/DashboardControls.tsx";
import { HeaderBackButton } from "@/components/ui/HeaderBackButton.tsx";
import { PageHeader } from "@/components/ui/PageHeader.tsx";
import { SystemTemplateBadge } from "@/components/ui/SystemTemplateBadge.tsx";
import { SystemTemplateCheckbox } from "@/components/ui/SystemTemplateCheckbox.tsx";
import { useI18n } from "@/context/I18nContext.tsx";
import { useAuth } from "@/features/auth/AuthContext.tsx";
import { EmailPreview } from "@/features/templates/email-templates/EmailPreview.tsx";
import {
  useCreateEmailTemplate,
  useEmailTemplate,
  useUpdateEmailTemplate,
} from "@/features/templates/hooks/useEmailTemplates.ts";
import { useKeyboardSave } from "@/lib/hooks/useKeyboardSave.ts";

const FLUSH_MARKDOWN_EDITOR_CLASS = "rounded-none border-x-0 border-b-0";

function MarkdownEditorField({
  id,
  label,
  required,
  showLabel = true,
  children,
}: {
  id: string;
  label: string;
  required?: boolean;
  showLabel?: boolean;
  children: ReactNode;
}) {
  return (
    <div>
      <label
        htmlFor={id}
        className={
          showLabel ? "block px-3 pb-1 text-xs font-medium text-[var(--ds-text-subtle)]" : "sr-only"
        }
      >
        {label}
        {required && (
          <SealWarningIcon
            weight="duotone"
            className="inline-block ml-1 size-3 text-red-500 align-middle"
          />
        )}
      </label>
      {children}
    </div>
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
  const { name, subject, headerBannerUrl, headerText, bodyText, footerBannerUrl, footerText } =
    form;

  const updateField = <K extends keyof TemplateFormFields>(
    key: K,
    value: TemplateFormFields[K],
  ) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const [savedIndicator, setSavedIndicator] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Populate form when existing template data arrives (adjust-state-during-render pattern)
  const syncedExistingIdRef = useRef<number | undefined>(undefined);
  if (existing && existing.id !== syncedExistingIdRef.current) {
    syncedExistingIdRef.current = existing.id;
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
        leading={
          <HeaderBackButton
            label={messages.emailTemplates.listTitle}
            onClick={() => navigate("/email-templates")}
          />
        }
      >
        <div className="flex items-center gap-3">
          {savedIndicator && (
            <span className="flex items-center gap-1 text-xs text-green-600 dark:text-green-400">
              <CheckCircleIcon weight="duotone" className="size-3.5" />
              {m.saved}
            </span>
          )}
          {error && <p className="text-xs text-red-500">{error}</p>}
          <SaveActionButton
            type="button"
            onClick={handleSave}
            disabled={isPending}
            label={isPending ? messages.common.saving : m.save}
          />
        </div>
      </PageHeader>

      <div className="flex shrink-0 items-end gap-3 px-3 py-2">
        <DashboardInput
          fieldClassName="w-64"
          id="email-template-name"
          type="text"
          value={name}
          onChange={(e) => updateField("name", e.target.value)}
          placeholder={m.newTemplate}
          className="font-mono"
          label={m.templateName}
        />
        <div className="ml-auto flex items-center">
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
      </div>

      <div className="flex-1 overflow-hidden">
        <div className="grid h-full grid-cols-1 gap-3 overflow-hidden xl:grid-cols-[minmax(0,1fr)_minmax(26rem,0.9fr)]">
          <div className="min-w-0 overflow-y-auto">
            <div className="space-y-4">
              <DashboardSection className="overflow-hidden">
                <DashboardSection.Header
                  icon={<EnvelopeSimpleIcon weight="duotone" className="size-4" />}
                  title={m.templateSubject}
                />
                <DashboardSection.Body>
                  <DashboardInput
                    aria-label={m.templateSubject}
                    id="tpl-subject"
                    required
                    type="text"
                    value={subject}
                    onChange={(event) => updateField("subject", event.target.value)}
                    placeholder={m.subjectPlaceholder}
                  />
                </DashboardSection.Body>
              </DashboardSection>

              <DashboardSection className="overflow-hidden">
                <DashboardSection.Header
                  icon={<EnvelopeOpenIcon weight="duotone" className="size-4" />}
                  title={m.sectionHeader}
                />
                <DashboardSection.Body className="!gap-0 !p-0">
                  <div className="p-3">
                    <DashboardInput
                      id="tpl-header-banner"
                      type="text"
                      value={headerBannerUrl}
                      onChange={(event) => updateField("headerBannerUrl", event.target.value)}
                      placeholder="https://example.com/header.png"
                      label={m.headerBanner}
                    />
                  </div>
                  <MarkdownEditorField id="tpl-header-text" label={m.headerText}>
                    <Suspense
                      fallback={
                        <div className="h-[6rem] animate-pulse rounded-control border border-[var(--ds-border)] bg-[var(--ds-input-bg)]" />
                      }
                    >
                      <MarkdownEditor
                        id="tpl-header-text"
                        value={headerText}
                        onChange={(v) => updateField("headerText", v)}
                        rows={4}
                        resizable
                        className={FLUSH_MARKDOWN_EDITOR_CLASS}
                      />
                    </Suspense>
                  </MarkdownEditorField>
                </DashboardSection.Body>
              </DashboardSection>

              <DashboardSection className="overflow-hidden">
                <DashboardSection.Header
                  icon={<ArticleIcon weight="duotone" className="size-4" />}
                  title={
                    <>
                      {m.sectionBody}
                      <SealWarningIcon
                        weight="duotone"
                        className="inline-block ml-1 size-3.5 text-red-500 align-middle"
                      />
                    </>
                  }
                />
                <DashboardSection.Body className="!gap-0 !p-0">
                  <MarkdownEditorField
                    id="tpl-body-text"
                    label={m.bodyText}
                    required
                    showLabel={false}
                  >
                    <Suspense
                      fallback={
                        <div className="h-[18rem] animate-pulse rounded-control border border-[var(--ds-border)] bg-[var(--ds-input-bg)]" />
                      }
                    >
                      <MarkdownEditor
                        id="tpl-body-text"
                        value={bodyText}
                        onChange={(v) => updateField("bodyText", v)}
                        rows={12}
                        resizable
                        className={FLUSH_MARKDOWN_EDITOR_CLASS}
                      />
                    </Suspense>
                  </MarkdownEditorField>
                </DashboardSection.Body>
              </DashboardSection>

              <DashboardSection className="overflow-hidden">
                <DashboardSection.Header
                  icon={<SquareHalfBottomIcon weight="duotone" className="size-4" />}
                  title={m.sectionFooter}
                />
                <DashboardSection.Body className="!gap-0 !p-0">
                  <div className="p-3">
                    <DashboardInput
                      id="tpl-footer-banner"
                      type="text"
                      value={footerBannerUrl}
                      onChange={(event) => updateField("footerBannerUrl", event.target.value)}
                      placeholder="https://example.com/footer.png"
                      label={m.footerBanner}
                    />
                  </div>
                  <MarkdownEditorField id="tpl-footer-text" label={m.footerText}>
                    <Suspense
                      fallback={
                        <div className="h-[6rem] animate-pulse rounded-control border border-[var(--ds-border)] bg-[var(--ds-input-bg)]" />
                      }
                    >
                      <MarkdownEditor
                        id="tpl-footer-text"
                        value={footerText}
                        onChange={(v) => updateField("footerText", v)}
                        rows={4}
                        resizable
                        className={FLUSH_MARKDOWN_EDITOR_CLASS}
                      />
                    </Suspense>
                  </MarkdownEditorField>
                </DashboardSection.Body>
              </DashboardSection>
            </div>
          </div>

          <div className="min-h-[32rem] overflow-hidden xl:min-h-0">
            <EmailPreview
              headerBannerUrl={headerBannerUrl}
              headerText={headerText}
              bodyText={bodyText}
              footerBannerUrl={footerBannerUrl}
              footerText={footerText}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
