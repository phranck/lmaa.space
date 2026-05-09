import { useEffect } from "react";

import {
  BLUESKY_FIXED_MAX_POST_CHARACTERS,
  MASTODON_DEFAULT_MAX_POST_CHARACTERS,
  type SocialMediaPostTemplate,
  type SocialMediaPostTemplateScope,
  type TemplateAssignment,
} from "@lmaa/contracts";
import { PLATFORM_MAP } from "@lmaa/ui";

import { useI18n } from "@/context/I18nContext.tsx";
import { usePostingAccount } from "@/features/social/hooks/useSocialMediaAccounts.ts";
import { useTemplateChoices } from "@/features/social/hooks/useTemplateChoices.ts";

export interface TemplateAssignmentsSectionProps {
  templates: SocialMediaPostTemplate[];
  scope: SocialMediaPostTemplateScope;
  assignments: TemplateAssignment[];
  onChange: (next: TemplateAssignment[]) => void;
  open: boolean;
  previewBody: (
    template: SocialMediaPostTemplate,
    platform: "mastodon" | "bluesky",
  ) => string;
  onOverflowChange: (hasOverflow: boolean) => void;
}

export function TemplateAssignmentsSection({
  templates,
  scope,
  assignments,
  onChange,
  open,
  previewBody,
  onOverflowChange,
}: TemplateAssignmentsSectionProps) {
  const { messages } = useI18n();
  const a = messages.socialMedia.approve;
  const masto = usePostingAccount("mastodon");
  const bsky = usePostingAccount("bluesky");
  const choices = useTemplateChoices(scope);

  useEffect(() => {
    if (!open) return;
    if (!choices.data) return;
    if (masto.isLoading || bsky.isLoading) return;
    const next: TemplateAssignment[] = [];
    if (masto.data?.isActive) {
      next.push({
        accountId: masto.data.id,
        templateId: choices.data[masto.data.id] ?? null,
      });
    }
    if (bsky.data?.isActive) {
      next.push({
        accountId: bsky.data.id,
        templateId: choices.data[bsky.data.id] ?? null,
      });
    }
    if (next.length !== assignments.length) {
      onChange(next);
    }
  }, [open, masto.data, bsky.data, choices.data, assignments.length, onChange]);

  function previewFor(
    platform: "mastodon" | "bluesky",
    templateId: number | null,
  ): { length: number; limit: number; overflow: boolean } | null {
    if (templateId === null) return null;
    const template = templates.find((t) => t.id === templateId);
    if (!template) return null;
    const text = previewBody(template, platform);
    const limit =
      platform === "bluesky"
        ? BLUESKY_FIXED_MAX_POST_CHARACTERS
        : (masto.data?.maxPostCharacters ?? MASTODON_DEFAULT_MAX_POST_CHARACTERS);
    return { length: text.length, limit, overflow: text.length > limit };
  }

  const hasOverflow = assignments.some((row) => {
    const platform =
      row.accountId === masto.data?.id
        ? "mastodon"
        : row.accountId === bsky.data?.id
          ? "bluesky"
          : null;
    if (!platform) return false;
    return previewFor(platform, row.templateId)?.overflow ?? false;
  });

  useEffect(() => {
    onOverflowChange(hasOverflow);
  }, [hasOverflow, onOverflowChange]);

  if (assignments.length === 0) return null;

  return (
    <section className="space-y-2 rounded-lg border border-[var(--ds-border)] p-3">
      <h4 className="text-xs font-semibold uppercase tracking-wide text-[var(--ds-text-muted)]">
        {a.postTo}
      </h4>
      {assignments.map((assignment) => {
        const account =
          assignment.accountId === masto.data?.id
            ? { platform: "mastodon" as const, label: masto.data.label }
            : assignment.accountId === bsky.data?.id
              ? { platform: "bluesky" as const, label: bsky.data.label }
              : null;
        if (!account) return null;
        const platformDef = PLATFORM_MAP.get(account.platform);
        const Icon = platformDef?.icon;
        const pool = templates.filter((t) => t.platforms.includes(account.platform));
        const selected =
          assignment.templateId !== null && pool.some((t) => t.id === assignment.templateId)
            ? assignment.templateId
            : null;
        const stale = assignment.templateId !== null && selected === null;
        const preview = previewFor(account.platform, selected);

        return (
          <div key={assignment.accountId} className="space-y-1">
            <div className="flex items-center gap-3 text-sm">
              <span className="flex w-32 shrink-0 items-center gap-1.5 text-[var(--ds-text)]">
                {Icon && <Icon size={14} />}
                <span>{account.label}</span>
              </span>
              <select
                className="h-9 flex-1 rounded-control border border-[var(--ds-border)] bg-[var(--ds-input-bg)] px-2 text-sm text-[var(--ds-text)]"
                value={selected ?? ""}
                onChange={(event) => {
                  const value = event.target.value === "" ? null : Number(event.target.value);
                  onChange(
                    assignments.map((row) =>
                      row.accountId === assignment.accountId
                        ? { ...row, templateId: value }
                        : row,
                    ),
                  );
                }}
              >
                <option value="">{a.noPost}</option>
                {pool.map((template) => (
                  <option key={template.id} value={template.id}>
                    {template.name}
                  </option>
                ))}
              </select>
              {preview && (
                <span
                  className={`shrink-0 text-xs tabular-nums ${
                    preview.overflow ? "text-red-500" : "text-[var(--ds-text-muted)]"
                  }`}
                >
                  {preview.length} / {preview.limit}
                </span>
              )}
              {stale && <span className="text-xs text-amber-500">{a.staleChoice}</span>}
            </div>
            {preview?.overflow && (
              <p className="ml-[8.5rem] text-xs text-red-500">{a.postOverflowWarning}</p>
            )}
          </div>
        );
      })}
    </section>
  );
}
