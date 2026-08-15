import type React from "react";

import { DashboardInput } from "@/components/ui/DashboardControls.tsx";

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
    handle: string;
    appPassword: string;
    appPasswordKeepHint: string;
    appPasswordRecommendation: string;
    appPasswordSettingsLink: string;
  };
  /** When true the app-password field is required (create mode). */
  requirePassword: boolean;
  /** When true (edit mode with existing token) the keep-current hint is shown. */
  hasStoredPassword: boolean;
}

const BLUESKY_APP_PASSWORDS_URL = "https://bsky.app/settings/app-passwords";

export function BlueskyAccountForm({
  form,
  onChange,
  labels,
  requirePassword,
  hasStoredPassword,
}: BlueskyAccountFormProps): React.ReactElement {
  return (
    <div className="flex flex-col gap-3">
      <DashboardInput
        className="font-mono"
        label={labels.handle}
        onChange={(event) => onChange({ ...form, handle: event.target.value })}
        placeholder="lmaa.bsky.social oder you@example.com"
        required={requirePassword}
        value={form.handle}
      />
      <DashboardInput
        autoComplete="new-password"
        className="font-mono"
        hint={
          <>
            {labels.appPasswordRecommendation}{" "}
            <a
              href={BLUESKY_APP_PASSWORDS_URL}
              target="_blank"
              rel="noreferrer noopener"
              className="text-[var(--ds-accent)] hover:underline"
            >
              {labels.appPasswordSettingsLink}
            </a>
          </>
        }
        label={
          <>
            {labels.appPassword}
            {!requirePassword && hasStoredPassword && (
              <span className="ml-2 text-[var(--ds-text-muted)]">
                ({labels.appPasswordKeepHint})
              </span>
            )}
          </>
        }
        onChange={(event) => onChange({ ...form, appPassword: event.target.value })}
        placeholder="xxxx-xxxx-xxxx-xxxx"
        required={requirePassword}
        type="password"
        value={form.appPassword}
      />
    </div>
  );
}
