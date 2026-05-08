import type React from "react";

import { formInputClass } from "@lmaa/ui";

export interface BlueskyAccountFormInput {
  label: string;
  handle: string;
  appPassword: string;
  isActive: boolean;
}

interface BlueskyAccountFormProps {
  form: BlueskyAccountFormInput;
  onChange: (form: BlueskyAccountFormInput) => void;
  labels: {
    label: string;
    handle: string;
    appPassword: string;
    appPasswordKeepHint: string;
  };
  /** When true the app-password field is required (create mode). */
  requirePassword: boolean;
  /** When true (edit mode with existing token) the keep-current hint is shown. */
  hasStoredPassword: boolean;
}

export function BlueskyAccountForm({
  form,
  onChange,
  labels,
  requirePassword,
  hasStoredPassword,
}: BlueskyAccountFormProps): React.ReactElement {
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
        <span className="text-xs font-medium text-[var(--ds-text-muted)]">{labels.handle}</span>
        <input
          value={form.handle}
          onChange={(event) => onChange({ ...form, handle: event.target.value })}
          className={`${formInputClass} font-mono`}
          placeholder="lmaa.bsky.social"
          required={requirePassword}
        />
      </label>
      <label className="space-y-1 md:col-span-2">
        <span className="text-xs font-medium text-[var(--ds-text-muted)]">
          {labels.appPassword}
          {!requirePassword && hasStoredPassword && (
            <span className="ml-2 text-[var(--ds-text-muted)]">
              ({labels.appPasswordKeepHint})
            </span>
          )}
        </span>
        <input
          type="password"
          value={form.appPassword}
          onChange={(event) => onChange({ ...form, appPassword: event.target.value })}
          className={`${formInputClass} font-mono`}
          placeholder="xxxx-xxxx-xxxx-xxxx"
          autoComplete="new-password"
          required={requirePassword}
        />
      </label>
    </div>
  );
}
