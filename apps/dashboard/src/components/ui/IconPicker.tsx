import { useState } from "react";

import { BUTTON_ICON_LIST, getButtonIconComponent } from "@lmaa/ui/button-icons";

import { DashboardButton, DashboardIconButton } from "@/components/ui/DashboardButton.tsx";
import { DashboardInput } from "@/components/ui/DashboardControls.tsx";
import { useI18n } from "@/context/I18nContext.tsx";

interface IconPickerProps {
  value: string | undefined;
  onChange: (name: string | undefined) => void;
  label: string;
  noneLabel: string;
}

const selectedIconPickerButtonClass =
  "border-[var(--color-primary)] bg-[color-mix(in_srgb,var(--color-primary)_30%,transparent)] text-[var(--color-primary)] hover:border-[var(--color-primary)] hover:bg-[color-mix(in_srgb,var(--color-primary)_38%,transparent)] hover:text-[var(--color-primary)] dark:text-white dark:hover:text-white";

export function IconPicker({ value, onChange, label, noneLabel }: IconPickerProps) {
  const { messages } = useI18n();
  const mp = messages.formBuilder.panel;
  const [query, setQuery] = useState("");

  const q = query.toLowerCase();
  const icons = BUTTON_ICON_LIST.filter((entry) => {
    if (!q) {
      return true;
    }

    const haystack = [entry.label, entry.name, ...(entry.keywords ?? [])].join(" ").toLowerCase();
    return haystack.includes(q);
  });

  return (
    <div className="flex flex-col gap-2">
      <span className="text-xs font-semibold text-[var(--ds-text-subtle)] uppercase tracking-wider">
        {label}
      </span>
      <DashboardInput
        type="search"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder={mp.iconPickerSearch}
      />
      <div className="grid grid-cols-6 gap-1 max-h-[276px] overflow-y-auto pr-px">
        {!q && (
          <DashboardButton
            type="button"
            aria-pressed={!value}
            title={noneLabel}
            onClick={() => onChange(undefined)}
            className={cx("w-full px-0", !value && selectedIconPickerButtonClass)}
            size="control"
            variant="neutral"
          >
            x
          </DashboardButton>
        )}
        {icons.length === 0 ? (
          <p className="col-span-6 py-4 text-center text-xs text-[var(--ds-text-muted)]">
            {mp.iconPickerEmpty}
          </p>
        ) : (
          icons.map((entry) => {
            const Icon = getButtonIconComponent(entry.name);

            if (!Icon) {
              return null;
            }

            return (
              <DashboardIconButton
                key={entry.name}
                type="button"
                aria-label={entry.label}
                aria-pressed={value === entry.name}
                title={entry.label}
                onClick={() => onChange(entry.name)}
                className={cx("w-full", value === entry.name && selectedIconPickerButtonClass)}
                size="control"
                variant="neutral"
              >
                <Icon width={18} height={18} />
              </DashboardIconButton>
            );
          })
        )}
      </div>
    </div>
  );
}

function cx(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ");
}
