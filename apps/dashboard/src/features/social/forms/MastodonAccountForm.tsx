import type React from "react";

import {
  MASTODON_DEFAULT_MAX_POST_CHARACTERS,
  MASTODON_MAX_POST_CHARACTERS_LIMIT,
  type MastodonVisibility,
} from "@lmaa/contracts";
import { formInputClass, formLabelClass } from "@lmaa/ui";

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
      <label>
        <span className={formLabelClass}>{labels.instanceUrl}</span>
        <input
          value={form.instanceUrl}
          onChange={(event) => onChange({ ...form, instanceUrl: event.target.value })}
          className={formInputClass}
          placeholder="https://mastodon.social"
        />
      </label>
      <label>
        <span className={formLabelClass}>{labels.username}</span>
        <input
          value={form.username ?? ""}
          onChange={(event) => onChange({ ...form, username: event.target.value })}
          className={formInputClass}
          placeholder="@lmaa"
        />
      </label>
      <label className="md:col-span-2">
        <span className={formLabelClass}>
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
      <div>
        <span className={formLabelClass}>{labels.visibility}</span>
        <Dropdown<MastodonVisibility>
          value={form.visibility}
          onChange={(value) => onChange({ ...form, visibility: value })}
          options={visibilityOptions}
          className="w-full"
          portal
        />
      </div>
      <label>
        <span className={formLabelClass}>{labels.maxPostCharacters}</span>
        <input
          type="number"
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
          className={formInputClass}
        />
      </label>
    </div>
  );
}
