import {
  BracketsCurlyIcon,
  CheckCircleIcon,
  ChatTextIcon,
  CopyIcon,
  DownloadIcon,
  EyeIcon,
  ListChecksIcon,
  PaperPlaneTiltIcon,
  SealWarningIcon,
} from "@phosphor-icons/react";
import { Suspense, lazy, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router";

import {
  BLUESKY_FIXED_MAX_POST_CHARACTERS,
  MASTODON_DEFAULT_MAX_POST_CHARACTERS,
  SOCIAL_MEDIA_POST_TEMPLATE_SCOPES,
  SOCIAL_MEDIA_POST_TEMPLATE_VARIABLES,
  type SocialMediaPlatform,
  type SocialMediaPostTemplateInput,
  type SocialMediaPostTemplateScope,
} from "@lmaa/contracts";
import { DashboardSection, FormLabel, formInputClass } from "@lmaa/ui";

import { HeaderBackButton } from "@/components/ui/HeaderBackButton.tsx";
import { PageHeader } from "@/components/ui/PageHeader.tsx";
import { SystemTemplateBadge } from "@/components/ui/SystemTemplateBadge.tsx";
import { SystemTemplateCheckbox } from "@/components/ui/SystemTemplateCheckbox.tsx";
import { useI18n } from "@/context/I18nContext.tsx";
import { useAuth } from "@/features/auth/AuthContext.tsx";
import { usePostingAccount } from "@/features/social/hooks/useSocialMediaAccounts.ts";
import {
  useCreateSocialMediaPostTemplate,
  useSocialMediaPostTemplate,
  useUpdateSocialMediaPostTemplate,
} from "@/features/templates/hooks/useSocialMediaPostTemplates.ts";
import { useKeyboardSave } from "@/lib/hooks/useKeyboardSave.ts";

const MarkdownEditor = lazy(() => import("@lmaa/ui").then((m) => ({ default: m.MarkdownEditor })));

type SocialMediaTemplateMessages = ReturnType<typeof useI18n>["messages"]["socialMediaTemplates"];

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
      categoryName: "Fair Fashion",
      categorySlug: "fair-fashion",
      categoryDescription: "Kleidung und Accessoires mit fairer Produktion.",
      categoryUrl: "https://lmaa.space/category/fair-fashion",
      categoryImageUrl: "https://lmaa.space/images/fair-fashion.jpg",
      frontendUrl: "https://lmaa.space",
      dashboardUrl: "https://admin.lmaa.space",
    };
    return examples[name] ?? "";
  });
}

const CATEGORY_TEMPLATE_VARIABLES = [
  "categoryName",
  "categorySlug",
  "categoryDescription",
  "categoryUrl",
  "categoryImageUrl",
  "frontendUrl",
  "dashboardUrl",
] as const;

const TEMPLATE_VARIABLE_SECTIONS = [
  { scope: "submission", variables: SOCIAL_MEDIA_POST_TEMPLATE_VARIABLES },
  { scope: "category", variables: CATEGORY_TEMPLATE_VARIABLES },
] as const satisfies readonly {
  scope: SocialMediaPostTemplateScope;
  variables: readonly string[];
}[];

export function SocialMediaPostTemplateEditPage() {
  const { messages } = useI18n();
  const m = messages.socialMediaTemplates;
  const navigate = useNavigate();
  const { user } = useAuth();
  const isOwner = Boolean(user?.isOwner);
  const { id: idParam } = useParams<{ id?: string }>();
  const isNew = !idParam || idParam === "new";
  const numId = isNew ? 0 : Number(idParam);
  const { data: existing, isLoading } = useSocialMediaPostTemplate(numId);
  const createMutation = useCreateSocialMediaPostTemplate();
  const updateMutation = useUpdateSocialMediaPostTemplate(numId);
  const [form, setForm] = useState<SocialMediaPostTemplateInput>({
    name: "",
    platforms: ["mastodon"],
    scopes: ["submission"],
    bodyMastodon: "",
    bodyBluesky: null,
    isSystemTemplate: false,
  });
  const syncedExistingIdRef = useRef<number | undefined>(undefined);
  const [savedIndicator, setSavedIndicator] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const mastoQuery = usePostingAccount("mastodon");
  const mastoMaxChars = mastoQuery.data?.maxPostCharacters ?? MASTODON_DEFAULT_MAX_POST_CHARACTERS;

  function togglePlatform(p: SocialMediaPlatform, on: boolean) {
    setForm((current) => {
      const next = new Set(current.platforms);
      if (on) next.add(p);
      else next.delete(p);
      if (next.size === 0) next.add(p);
      const platforms = Array.from(next) as SocialMediaPlatform[];
      return {
        ...current,
        platforms,
        bodyMastodon: next.has("mastodon") ? (current.bodyMastodon ?? "") : null,
        bodyBluesky: next.has("bluesky") ? (current.bodyBluesky ?? "") : null,
      };
    });
  }

  function toggleScope(s: SocialMediaPostTemplateScope, on: boolean) {
    setForm((current) => {
      const next = new Set(current.scopes);
      if (on) next.add(s);
      else next.delete(s);
      if (next.size === 0) next.add(s);
      return { ...current, scopes: Array.from(next) as SocialMediaPostTemplateScope[] };
    });
  }

  if (existing && existing.id !== syncedExistingIdRef.current) {
    syncedExistingIdRef.current = existing.id;
    setForm({
      name: existing.name,
      platforms: existing.platforms,
      scopes: existing.scopes,
      bodyMastodon: existing.bodyMastodon,
      bodyBluesky: existing.bodyBluesky,
      isSystemTemplate: existing.isSystemTemplate,
    });
  }

  const preview = useMemo(() => renderPreview(form.bodyMastodon ?? ""), [form.bodyMastodon]);

  function handleSave() {
    setError(null);
    if (form.scopes.length === 0) {
      setError(m.scopes.validationMin);
      return;
    }
    const payload: SocialMediaPostTemplateInput = {
      name: form.name.trim(),
      platforms: form.platforms,
      scopes: form.scopes,
      bodyMastodon: form.bodyMastodon,
      bodyBluesky: form.bodyBluesky,
      isSystemTemplate: isOwner ? form.isSystemTemplate : undefined,
    };

    if (isNew) {
      createMutation.mutate(payload, {
        onSuccess: (created) => {
          void navigate(`/social-media-post-templates/${created.id}`, { replace: true });
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
            onClick={() => navigate("/social-media-post-templates")}
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
          <button
            type="button"
            onClick={handleSave}
            disabled={isPending}
            className="flex h-9 items-center gap-2 rounded-control border border-[var(--ds-btn-primary-border)] px-4 text-sm font-medium text-[var(--ds-btn-primary-text)] hover:border-[var(--ds-btn-primary-hover-border)] hover:bg-[var(--ds-btn-primary-hover-bg)] disabled:opacity-60"
          >
            <DownloadIcon weight="duotone" className="size-3.5" />
            {isPending ? messages.common.saving : m.save}
          </button>
        </div>
      </PageHeader>

      <div className="flex shrink-0 items-end gap-3 px-3 py-2">
        <div className="w-64">
          <FormLabel htmlFor="social-media-template-name">{m.templateName}</FormLabel>
          <input
            id="social-media-template-name"
            type="text"
            value={form.name}
            onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
            placeholder={m.newTemplate}
            className={`${formInputClass} font-mono`}
          />
        </div>
        <div className="ml-auto flex items-center">
          {form.isSystemTemplate && !isOwner && <SystemTemplateBadge label={m.systemBadge} />}
          {isOwner && (
            <SystemTemplateCheckbox
              checked={form.isSystemTemplate ?? false}
              onChange={(value) => setForm((current) => ({ ...current, isSystemTemplate: value }))}
              label={m.systemCheckbox}
              hint={m.systemHint}
            />
          )}
        </div>
      </div>

      <div className="flex-1 overflow-hidden">
        <div className="grid h-full grid-cols-1 gap-3 overflow-hidden xl:grid-cols-[minmax(0,1fr)_24rem]">
          <div className="min-w-0 overflow-y-auto">
            <div className="mb-4">
              <DashboardSection className="h-full">
                <DashboardSection.Header
                  icon={<PaperPlaneTiltIcon weight="duotone" className="size-4" />}
                  title={m.platformsLabel.replace(/:$/, "")}
                />
                <DashboardSection.Body className="!gap-2">
                  <div className="flex flex-wrap items-center gap-4 text-sm">
                    <label className="flex items-center gap-1.5">
                      <input
                        type="checkbox"
                        checked={form.platforms.includes("mastodon")}
                        onChange={(event) => togglePlatform("mastodon", event.target.checked)}
                      />
                      <span>{m.platformMastodon}</span>
                    </label>
                    <label className="flex items-center gap-1.5">
                      <input
                        type="checkbox"
                        checked={form.platforms.includes("bluesky")}
                        onChange={(event) => togglePlatform("bluesky", event.target.checked)}
                      />
                      <span>{m.platformBluesky}</span>
                    </label>
                  </div>
                </DashboardSection.Body>
              </DashboardSection>
            </div>

            <div className="space-y-4">
              {form.platforms.includes("mastodon") && (
                <BodyEditor
                  idBase="mastodon-post-body"
                  label={m.bodyMastodonLabel}
                  value={form.bodyMastodon ?? ""}
                  onChange={(bodyMastodon) => setForm((current) => ({ ...current, bodyMastodon }))}
                  counterMax={mastoMaxChars}
                  hint={!mastoQuery.data ? "(no Mastodon account configured)" : undefined}
                />
              )}

              {form.platforms.includes("bluesky") && (
                <BodyEditor
                  idBase="bluesky-post-body"
                  label={m.bodyBlueskyLabel}
                  value={form.bodyBluesky ?? ""}
                  onChange={(bodyBluesky) => setForm((current) => ({ ...current, bodyBluesky }))}
                  counterMax={BLUESKY_FIXED_MAX_POST_CHARACTERS}
                />
              )}

              <DashboardSection>
                <DashboardSection.Header
                  icon={<EyeIcon weight="duotone" className="size-4" />}
                  title={m.previewTitle}
                />
                <DashboardSection.Body>
                  <pre className="whitespace-pre-wrap break-words rounded-control bg-[var(--ds-bg-elevated)] p-3 text-sm leading-relaxed text-[var(--ds-text)]">
                    {preview || m.emptyPreview}
                  </pre>
                </DashboardSection.Body>
              </DashboardSection>
            </div>
          </div>

          <TemplateVariablesSidebar messages={m} scopes={form.scopes} onScopeToggle={toggleScope} />
        </div>
      </div>
    </div>
  );
}

function TemplateVariablesSidebar({
  messages,
  scopes,
  onScopeToggle,
}: {
  messages: SocialMediaTemplateMessages;
  scopes: SocialMediaPostTemplateScope[];
  onScopeToggle: (scope: SocialMediaPostTemplateScope, on: boolean) => void;
}) {
  const selectedScopes = new Set(scopes);
  const visibleVariableSections = TEMPLATE_VARIABLE_SECTIONS.filter(({ scope }) =>
    selectedScopes.has(scope),
  );
  const [copiedVariable, setCopiedVariable] = useState<string | null>(null);
  const copyResetTimeoutRef = useRef<ReturnType<typeof window.setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (copyResetTimeoutRef.current) {
        window.clearTimeout(copyResetTimeoutRef.current);
      }
    };
  }, []);

  async function handleCopyVariable(variable: string) {
    const token = `{{${variable}}}`;

    try {
      await navigator.clipboard.writeText(token);
    } catch {
      return;
    }

    if (copyResetTimeoutRef.current) {
      window.clearTimeout(copyResetTimeoutRef.current);
    }

    setCopiedVariable(variable);
    copyResetTimeoutRef.current = window.setTimeout(() => {
      setCopiedVariable(null);
      copyResetTimeoutRef.current = null;
    }, 1500);
  }

  return (
    <aside className="overflow-y-auto">
      <div className="space-y-4">
        <DashboardSection>
          <DashboardSection.Header
            icon={<ListChecksIcon weight="duotone" className="size-4" />}
            title={messages.scopesLabel}
          />
          <DashboardSection.Body className="!gap-2">
            <div className="flex flex-wrap items-center gap-4 text-sm">
              {SOCIAL_MEDIA_POST_TEMPLATE_SCOPES.map((scope) => (
                <label key={scope} className="flex items-center gap-1.5">
                  <input
                    type="checkbox"
                    checked={scopes.includes(scope)}
                    onChange={(event) => onScopeToggle(scope, event.target.checked)}
                  />
                  <span>{messages.scopes[scope]}</span>
                </label>
              ))}
            </div>
            <p className="text-xs text-[var(--ds-text-subtle)]">{messages.scopes.helpText}</p>
          </DashboardSection.Body>
        </DashboardSection>

        {visibleVariableSections.map(({ scope, variables }) => (
          <DashboardSection
            key={scope}
            collapsible
            collapseButtonLabel={`${messages.scopes[scope]} ${messages.variablesTitle}`}
          >
            <DashboardSection.Header
              icon={<BracketsCurlyIcon weight="duotone" className="size-4" />}
              title={messages.scopes[scope]}
              subtitle={messages.variablesTitle}
            />
            <DashboardSection.Body className="!gap-2">
              <dl className="overflow-hidden rounded-control border border-[var(--ds-border)] bg-[var(--ds-bg-elevated)]">
                {variables.map((variable) => (
                  <TemplateVariableItem
                    key={variable}
                    variable={variable}
                    description={messages.variables[variable]}
                    copied={copiedVariable === variable}
                    copyLabel={messages.copyVariable}
                    copiedLabel={messages.copiedVariable}
                    onCopy={handleCopyVariable}
                  />
                ))}
              </dl>
            </DashboardSection.Body>
          </DashboardSection>
        ))}
      </div>
    </aside>
  );
}

function TemplateVariableItem({
  variable,
  description,
  copied,
  copyLabel,
  copiedLabel,
  onCopy,
}: {
  variable: string;
  description: string;
  copied: boolean;
  copyLabel: string;
  copiedLabel: string;
  onCopy: (variable: string) => void;
}) {
  const token = `{{${variable}}}`;

  return (
    <div className="flex items-start gap-2 border-b border-[var(--ds-border-subtle)] px-2.5 py-2 last:border-b-0">
      <div className="min-w-0 flex-1">
        <dt className="font-mono text-[11px] font-semibold leading-5 text-[var(--ds-text)]">
          {token}
        </dt>
        <dd className="text-xs leading-snug text-[var(--ds-text-muted)]">{description}</dd>
      </div>
      <button
        type="button"
        onClick={() => onCopy(variable)}
        aria-label={`${copied ? copiedLabel : copyLabel}: ${token}`}
        title={copied ? copiedLabel : copyLabel}
        className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-control text-[var(--ds-text-muted)] hover:bg-[var(--ds-nav-hover-bg)] hover:text-[var(--ds-text)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
      >
        {copied ? (
          <CheckCircleIcon weight="duotone" className="size-3.5 text-green-600 dark:text-green-400" />
        ) : (
          <CopyIcon weight="duotone" className="size-3.5" />
        )}
      </button>
    </div>
  );
}

function BodyEditor({
  idBase,
  label,
  value,
  onChange,
  counterMax,
  hint,
}: {
  idBase: string;
  label: string;
  value: string;
  onChange: (next: string) => void;
  counterMax: number;
  hint?: string;
}) {
  const remaining = counterMax - value.length;
  const overLimit = remaining < 0;
  return (
    <DashboardSection>
      <DashboardSection.Header
        icon={<ChatTextIcon weight="duotone" className="size-4" />}
        title={label}
        addOn={
          <span
            className={overLimit ? "text-xs text-red-500" : "text-xs text-[var(--ds-text-muted)]"}
          >
            {value.length} / {counterMax}
          </span>
        }
      />
      <DashboardSection.Body className="!gap-2">
        {hint && (
          <p className="flex items-center gap-1.5 text-xs italic text-[var(--ds-text-muted)]">
            <SealWarningIcon weight="duotone" className="size-3 text-red-500" />
            {hint}
          </p>
        )}
        <Suspense
          fallback={
            <div className="h-[18rem] animate-pulse rounded-control border border-[var(--ds-border)] bg-[var(--ds-input-bg)]" />
          }
        >
          <MarkdownEditor id={idBase} value={value} onChange={onChange} rows={12} resizable />
        </Suspense>
      </DashboardSection.Body>
    </DashboardSection>
  );
}
