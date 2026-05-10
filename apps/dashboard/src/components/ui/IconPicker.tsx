import { useState } from "react";

import { BUTTON_ICON_LIST, getButtonIconComponent } from "@lmaa/ui";

import { DashboardButton, DashboardIconButton } from "@/components/ui/DashboardButton.tsx";
import { DashboardInput } from "@/components/ui/DashboardControls.tsx";
import { useI18n } from "@/context/I18nContext.tsx";

interface IconPickerProps {
  value: string | undefined;
  onChange: (name: string | undefined) => void;
  label: string;
  noneLabel: string;
}

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
            title={noneLabel}
            onClick={() => onChange(undefined)}
            className="w-full px-0"
            size="control"
            variant={!value ? "primary" : "neutral"}
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
                title={entry.label}
                onClick={() => onChange(entry.name)}
                className="w-full"
                size="control"
                variant={value === entry.name ? "primary" : "neutral"}
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
