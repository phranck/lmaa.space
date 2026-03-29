import { useState } from "react";

import { BUTTON_ICON_LIST, getButtonIconComponent } from "@lmaa/ui";

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
      <input
        type="search"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder={mp.iconPickerSearch}
        className="w-full px-2 py-1 text-xs bg-[var(--ds-input-bg)] border border-[var(--ds-border)] rounded-control text-[var(--ds-text)] placeholder:text-[var(--ds-text-muted)] focus:outline-none focus:ring-1 focus:ring-[var(--color-primary)]"
      />
      <div className="grid grid-cols-6 gap-1 max-h-[276px] overflow-y-auto pr-px">
        {!q && (
          <button
            type="button"
            title={noneLabel}
            onClick={() => onChange(undefined)}
            className={`h-8 flex items-center justify-center rounded-control border text-xs ${
              !value
                ? "border-[var(--color-primary)] bg-[var(--ds-nav-active-bg)] text-[var(--ds-nav-active-text)]"
                : "border-[var(--ds-border)] bg-[var(--ds-input-bg)] text-[var(--ds-text-subtle)] hover:border-[var(--color-primary)]"
            }`}
          >
            —
          </button>
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
              <button
                key={entry.name}
                type="button"
                title={entry.label}
                onClick={() => onChange(entry.name)}
                className={`h-9 flex items-center justify-center rounded-control border ${
                  value === entry.name
                    ? "border-[var(--color-primary)] bg-[var(--ds-nav-active-bg)] text-[var(--ds-nav-active-text)]"
                    : "border-[var(--ds-border)] bg-[var(--ds-input-bg)] text-[var(--ds-text)] hover:border-[var(--color-primary)]"
                }`}
              >
                <Icon width={18} height={18} />
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}
