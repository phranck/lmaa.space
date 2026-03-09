import { useEffect, useState } from "react";

import { SegmentSwitch } from "@/components/ui/SegmentSwitch.tsx";
import { useI18n } from "@/context/I18nContext.tsx";
import { BUTTON_ICON_LIST } from "@/features/templates/form-builder/buttonIconMap.tsx";
import { LazyMonochromeIcon } from "@/features/templates/form-builder/LazyMonochromeIcon.tsx";

interface IconPickerProps {
  value: string | undefined;
  onChange: (name: string | undefined) => void;
  label: string;
  noneLabel: string;
}

export function IconPicker({ value, onChange, label, noneLabel }: IconPickerProps) {
  const { messages } = useI18n();
  const mp = messages.formBuilder.panel;
  const [variant, setVariant] = useState<"outline" | "filled">("outline");
  const [query, setQuery] = useState("");

  useEffect(() => {
    if (!value) return;
    const isFilled = BUTTON_ICON_LIST.some((entry) => entry.filledName === value);
    setVariant(isFilled ? "filled" : "outline");
  }, [value]);

  function switchVariant(next: "outline" | "filled") {
    if (value) {
      const entry = BUTTON_ICON_LIST.find(
        (candidate) => candidate.outlineName === value || candidate.filledName === value,
      );
      if (entry) onChange(next === "outline" ? entry.outlineName : entry.filledName);
    }
    setVariant(next);
  }

  const q = query.toLowerCase();
  const icons = BUTTON_ICON_LIST.filter((entry) => !q || entry.label.toLowerCase().includes(q)).map(
    (entry) =>
      variant === "outline"
        ? { name: entry.outlineName, label: entry.label }
        : { name: entry.filledName, label: entry.label },
  );

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-[var(--ds-text-subtle)] uppercase tracking-wider">
          {label}
        </span>
        <SegmentSwitch
          value={variant}
          onChange={switchVariant}
          options={[
            { value: "outline" as const, label: mp.iconPickerVariantOutline },
            { value: "filled" as const, label: mp.iconPickerVariantFilled },
          ]}
        />
      </div>
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
            className={`h-8 flex items-center justify-center rounded-control border text-xs transition-colors ${
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
          icons.map(({ name, label: iconLabel }) => (
            <button
              key={name}
              type="button"
              title={iconLabel}
              onClick={() => onChange(name)}
              className={`h-9 flex items-center justify-center rounded-control border transition-colors ${
                value === name
                  ? "border-[var(--color-primary)] bg-[var(--ds-nav-active-bg)] text-[var(--ds-nav-active-text)]"
                  : "border-[var(--ds-border)] bg-[var(--ds-input-bg)] text-[var(--ds-text)] hover:border-[var(--color-primary)]"
              }`}
            >
              <LazyMonochromeIcon name={name} width={18} height={18} />
            </button>
          ))
        )}
      </div>
    </div>
  );
}
