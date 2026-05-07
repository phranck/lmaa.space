import type React from "react";

import type { MastodonVisibility } from "@lmaa/contracts";
import { ToggleSwitch, formInputClass } from "@lmaa/ui";

import type { MastodonAccountFormInput } from "@/features/social/hooks/useMastodonAccounts.ts";

const VISIBILITY_OPTIONS: MastodonVisibility[] = ["public", "unlisted", "private", "direct"];

interface MastodonAccountFormProps {
  form: MastodonAccountFormInput;
  onChange: (form: MastodonAccountFormInput) => void;
  visibilityLabels: Record<MastodonVisibility, string>;
  labels: {
    label: string;
    instanceUrl: string;
    username: string;
    accessToken: string;
    accessTokenOptional: string;
    visibility: string;
    active: string;
  };
  tokenPlaceholder: string;
  /** When true the access token field is required (create mode). */
  requireToken: boolean;
}

export function MastodonAccountForm({
  form,
  onChange,
  visibilityLabels,
  labels,
  tokenPlaceholder,
  requireToken,
}: MastodonAccountFormProps): React.ReactElement {
  return (
    <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
      <label className="space-y-1">
        <span className="text-xs font-medium text-[var(--ds-text-muted)]">{labels.label}</span>
        <input
          value={form.label}
          onChange={(event) => onChange({ ...form, label: event.target.value })}
          className={formInputClass}
          placeholder="lmaa.space"
        />
      </label>
      <label className="space-y-1">
        <span className="text-xs font-medium text-[var(--ds-text-muted)]">
          {labels.instanceUrl}
        </span>
        <input
          value={form.instanceUrl}
          onChange={(event) => onChange({ ...form, instanceUrl: event.target.value })}
          className={formInputClass}
          placeholder="https://mastodon.social"
        />
      </label>
      <label className="space-y-1">
        <span className="text-xs font-medium text-[var(--ds-text-muted)]">{labels.username}</span>
        <input
          value={form.username ?? ""}
          onChange={(event) => onChange({ ...form, username: event.target.value })}
          className={formInputClass}
          placeholder="@lmaa"
        />
      </label>
      <label className="space-y-1">
        <span className="text-xs font-medium text-[var(--ds-text-muted)]">
          {requireToken ? labels.accessToken : labels.accessTokenOptional}
        </span>
        <input
          type="password"
          value={form.accessToken ?? ""}
          onChange={(event) => onChange({ ...form, accessToken: event.target.value })}
          className={formInputClass}
          placeholder={tokenPlaceholder}
          autoComplete="new-password"
        />
      </label>
      <label className="space-y-1">
        <span className="text-xs font-medium text-[var(--ds-text-muted)]">{labels.visibility}</span>
        <select
          value={form.visibility}
          onChange={(event) =>
            onChange({ ...form, visibility: event.target.value as MastodonVisibility })
          }
          className={formInputClass}
        >
          {VISIBILITY_OPTIONS.map((visibility) => (
            <option key={visibility} value={visibility}>
              {visibilityLabels[visibility]}
            </option>
          ))}
        </select>
      </label>
      <div className="flex items-end justify-between gap-3 rounded-control border border-[var(--ds-border)] px-3 py-2">
        <span className="text-sm font-medium text-[var(--ds-text)]">{labels.active}</span>
        <ToggleSwitch
          checked={form.isActive}
          onChange={(isActive) => onChange({ ...form, isActive })}
        />
      </div>
    </div>
  );
}
