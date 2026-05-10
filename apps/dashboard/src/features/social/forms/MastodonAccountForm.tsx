import type React from "react";

import {
  MASTODON_DEFAULT_MAX_POST_CHARACTERS,
  MASTODON_MAX_POST_CHARACTERS_LIMIT,
  type MastodonVisibility,
} from "@lmaa/contracts";

import {
  DashboardInput,
  DashboardNumberInput,
} from "@/components/ui/DashboardControls.tsx";
import { Dropdown, type DropdownOption } from "@/components/ui/Dropdown.tsx";

export interface MastodonAccountFormInput {
  label: string;
  instanceUrl: string;
  username?: string;
  accessToken?: string;
  visibility: MastodonVisibility;
  maxPostCharacters: number;
  isActive: boolean;
}

const VISIBILITY_OPTIONS: MastodonVisibility[] = ["public", "unlisted", "private", "direct"];

interface MastodonAccountFormProps {
  form: MastodonAccountFormInput;
  onChange: (form: MastodonAccountFormInput) => void;
  visibilityLabels: Record<MastodonVisibility, string>;
  labels: {
    instanceUrl: string;
    username: string;
    accessToken: string;
    accessTokenOptional: string;
    visibility: string;
    maxPostCharacters: string;
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
  const visibilityOptions: DropdownOption<MastodonVisibility>[] = VISIBILITY_OPTIONS.map((v) => ({
    value: v,
    label: visibilityLabels[v],
  }));

  return (
    <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
      <DashboardInput
        label={labels.instanceUrl}
        value={form.instanceUrl}
        onChange={(event) => onChange({ ...form, instanceUrl: event.target.value })}
        placeholder="https://mastodon.social"
      />
      <DashboardInput
        label={labels.username}
        value={form.username ?? ""}
        onChange={(event) => onChange({ ...form, username: event.target.value })}
        placeholder="@lmaa"
      />
      <DashboardInput
        autoComplete="new-password"
        fieldClassName="md:col-span-2"
        label={requireToken ? labels.accessToken : labels.accessTokenOptional}
        onChange={(event) => onChange({ ...form, accessToken: event.target.value })}
        placeholder={tokenPlaceholder}
        type="password"
        value={form.accessToken ?? ""}
      />
      <div>
        <span className="mb-1 block px-[5px] text-xs font-medium text-[var(--ds-text-subtle)]">
          {labels.visibility}
        </span>
        <Dropdown<MastodonVisibility>
          value={form.visibility}
          onChange={(value) => onChange({ ...form, visibility: value })}
          options={visibilityOptions}
          className="w-full"
          portal
        />
      </div>
      <DashboardNumberInput
        label={labels.maxPostCharacters}
        min={1}
        max={MASTODON_MAX_POST_CHARACTERS_LIMIT}
        value={form.maxPostCharacters}
        onChange={(event) =>
          onChange({
            ...form,
            maxPostCharacters:
              Number(event.target.value) || MASTODON_DEFAULT_MAX_POST_CHARACTERS,
          })
        }
      />
    </div>
  );
}
