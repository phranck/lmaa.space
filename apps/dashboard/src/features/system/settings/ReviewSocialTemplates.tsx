import { memo, useMemo } from "react";

import type { TemplateAssignment } from "@lmaa/contracts";
import { PLATFORM_MAP } from "@lmaa/ui/social-media-platforms";

import { DashboardCombobox } from "@/components/ui/DashboardControls.tsx";
import { useI18n } from "@/context/I18nContext.tsx";
import { usePostingAccount } from "@/features/social/hooks/useSocialMediaAccounts.ts";
import { useSocialMediaPostTemplates } from "@/features/templates/hooks/useSocialMediaPostTemplates.ts";

export interface ReviewSocialTemplatesProps {
  /** What is configured, as it is stored. */
  assignments: TemplateAssignment[];
  onChange: (next: TemplateAssignment[]) => void;
  disabled: boolean;
}

/**
 * Chooses which template each posting account announces an automatic admission
 * with.
 *
 * @remarks
 * The manual admission asks the same question in its dialogue, and it asks it
 * per submission with a live character count against that shop's text. Here
 * there is no shop to count against, and the answer is kept once rather than
 * per decision, so this offers the accounts and their templates and nothing
 * else.
 *
 * An account with no template chosen posts nothing, which is how the whole
 * feature stays off until somebody turns it on.
 */
export const ReviewSocialTemplates = memo(function ReviewSocialTemplates({
  assignments,
  onChange,
  disabled,
}: ReviewSocialTemplatesProps) {
  const { messages } = useI18n();
  const t = messages.system.settings.review;
  const mastodon = usePostingAccount("mastodon");
  const bluesky = usePostingAccount("bluesky");
  const { data: templates, isLoading } = useSocialMediaPostTemplates("submission");

  const accounts = useMemo(
    () =>
      [
        mastodon.data?.isActive
          ? { id: mastodon.data.id, platform: "mastodon" as const, label: mastodon.data.label }
          : null,
        bluesky.data?.isActive
          ? { id: bluesky.data.id, platform: "bluesky" as const, label: bluesky.data.label }
          : null,
      ].flatMap((account) => (account ? [account] : [])),
    [mastodon.data, bluesky.data],
  );

  if (accounts.length === 0) {
    return <p className="text-sm text-[var(--ds-text-muted)]">{t.socialNoAccounts}</p>;
  }

  return (
    <div className="flex flex-col gap-3">
      {accounts.map((account) => {
        const Icon = PLATFORM_MAP.get(account.platform)?.icon;
        const pool = (templates ?? []).filter((template) =>
          template.platforms.includes(account.platform),
        );
        const chosen = assignments.find((entry) => entry.accountId === account.id)?.templateId;

        return (
          <DashboardCombobox
            key={account.id}
            id={`review-social-${account.platform}`}
            fullWidth
            label={
              <span className="flex items-center gap-1.5">
                {Icon && <Icon size={14} />}
                <span>{account.label}</span>
              </span>
            }
            disabled={disabled || isLoading}
            value={String(chosen ?? "")}
            onValueChange={(value) => {
              const templateId = value === "" ? null : Number(value);
              const others = assignments.filter((entry) => entry.accountId !== account.id);
              onChange([...others, { accountId: account.id, templateId }]);
            }}
            options={[
              { value: "", label: t.socialNoPost },
              ...pool.map((template) => ({ value: String(template.id), label: template.name })),
            ]}
          />
        );
      })}
    </div>
  );
});
