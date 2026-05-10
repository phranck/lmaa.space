import {
  BracketsCurlyIcon,
  CheckCircleIcon,
  ChatTextIcon,
  DownloadIcon,
  EyeIcon,
  ListChecksIcon,
  PaperPlaneTiltIcon,
  SealWarningIcon,
} from "@phosphor-icons/react";
import { Suspense, lazy, useMemo, useRef, useState } from "react";
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
import { DashboardSection } from "@lmaa/ui";

import { HeaderBackButton } from "@/components/ui/HeaderBackButton.tsx";
import { PageHeader } from "@/components/ui/PageHeader.tsx";
import {
  SystemTemplateBadge,
  SystemTemplateCheckbox,
} from "@/components/ui/SystemTemplateBadge.tsx";
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

      <div className="flex shrink-0 items-center gap-3 px-3 py-1.5">
        <button
          type="button"
          onClick={() => navigate("/social-media-post-templates")}
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

      <div className="flex-1 overflow-hidden">
        <div className="grid h-full grid-cols-1 gap-3 overflow-hidden xl:grid-cols-[minmax(0,1fr)_24rem]">
          <div className="min-w-0 overflow-y-auto">
            <div className="mb-4 grid grid-cols-1 gap-3 lg:grid-cols-2">
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

              <DashboardSection className="h-full">
                <DashboardSection.Header
                  icon={<ListChecksIcon weight="duotone" className="size-4" />}
                  title={m.scopesLabel}
                />
                <DashboardSection.Body className="!gap-2">
                  <div className="flex flex-wrap items-center gap-4 text-sm">
                    {SOCIAL_MEDIA_POST_TEMPLATE_SCOPES.map((scope) => (
                      <label key={scope} className="flex items-center gap-1.5">
                        <input
                          type="checkbox"
                          checked={form.scopes.includes(scope)}
                          onChange={(event) => toggleScope(scope, event.target.checked)}
                        />
                        <span>{m.scopes[scope]}</span>
                      </label>
                    ))}
                  </div>
                  <p className="text-xs text-[var(--ds-text-subtle)]">{m.scopes.helpText}</p>
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

          <TemplateVariablesSidebar messages={m} scopes={form.scopes} />
        </div>
      </div>
    </div>
  );
}

function TemplateVariablesSidebar({
  messages,
  scopes,
}: {
  messages: SocialMediaTemplateMessages;
  scopes: SocialMediaPostTemplateScope[];
}) {
  const selectedScopes = new Set(scopes);
  const visibleVariableSections = TEMPLATE_VARIABLE_SECTIONS.filter(({ scope }) =>
    selectedScopes.has(scope),
  );

  return (
    <aside className="overflow-y-auto">
      <div className="space-y-4">
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
              <dl className="space-y-2">
                {variables.map((variable) => (
                  <div
                    key={variable}
                    className="rounded-control border border-[var(--ds-border)] bg-[var(--ds-bg-elevated)] p-3"
                  >
                    <dt className="font-mono text-xs font-semibold text-[var(--ds-text)]">
                      {"{{"}
                      {variable}
                      {"}}"}
                    </dt>
                    <dd className="mt-1 text-xs leading-relaxed text-[var(--ds-text-muted)]">
                      {messages.variables[variable]}
                    </dd>
                  </div>
                ))}
              </dl>
            </DashboardSection.Body>
          </DashboardSection>
        ))}
      </div>
    </aside>
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
