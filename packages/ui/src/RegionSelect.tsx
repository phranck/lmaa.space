import { CaretDownIcon, CaretUpIcon, CheckIcon } from "@phosphor-icons/react";
import { useId, useRef, useState } from "react";

import { REGION_CODES, type RegionCode } from "@lmaa/shared";

import { formLabelClass } from "./FormPrimitives.tsx";
import { ControlTrigger, ListboxOption, ListboxPopover } from "./ListboxPrimitives.tsx";

/**
 * Display option used by region select inputs.
 */
export interface RegionSelectOption {
  code: RegionCode;
  flag: string;
  name: string;
}

/**
 * Localizable copy contract for the region select component.
 */
export interface RegionSelectMessages {
  label: string;
  placeholder: string;
}

/**
 * Flag mapping keyed by {@link RegionCode}.
 */
export const REGION_FLAGS: Readonly<Record<RegionCode, string>> = {
  DE: "🇩🇪",
  AT: "🇦🇹",
  CH: "🇨🇭",
  EU: "🇪🇺",
  WORLD: "🌍",
};

/**
 * Creates region options from translated names while keeping canonical region order.
 *
 * @param regionNames Region label mapping keyed by `RegionCode`.
 * @returns Ordered list of options with flag + translated name.
 */
export function createRegionOptions(
  regionNames: Readonly<Record<RegionCode, string>>,
): ReadonlyArray<RegionSelectOption> {
  return REGION_CODES.map((code) => ({ code, flag: REGION_FLAGS[code], name: regionNames[code] }));
}

/**
 * Canonical region option set shared across dashboard and website forms.
 */
export function createDefaultRegionOptions(locale: "de" | "en" = "de"): ReadonlyArray<RegionSelectOption> {
  return createRegionOptions(
    locale === "en"
      ? {
          DE: "Germany",
          AT: "Austria",
          CH: "Switzerland",
          EU: "Europe",
          WORLD: "World",
        }
      : {
          DE: "Deutschland",
          AT: "Österreich",
          CH: "Schweiz",
          EU: "Europa",
          WORLD: "Weltweit",
        },
  );
}

/**
 * Re-export of shared `RegionCode` union for UI consumers.
 */
export type { RegionCode };

/**
 * Props for the shared region select component.
 */
export interface RegionSelectProps {
  value: string[];
  onChange: (value: string[]) => void;
  options: ReadonlyArray<RegionSelectOption>;
  messages: RegionSelectMessages;
  error?: string;
  buttonClassName?: string;
  variant?: "dashboard" | "frontend";
}

/**
 * Region multi-select input with portal dropdown and optional info popover.
 */
export function RegionSelect({
  value,
  onChange,
  options,
  messages,
  error,
  buttonClassName,
  variant = "dashboard",
}: RegionSelectProps) {
  const [open, setOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const listboxId = useId();
  const optionValues = options.map((option) => option.code);

  function toggle(code: RegionCode) {
    if (value.includes(code)) {
      onChange(value.filter((v) => v !== code));
      return;
    }
    if (code === "WORLD") {
      onChange(["WORLD"]);
      return;
    }

    if (code === "EU") {
      onChange(["EU"]);
      return;
    }

    onChange([...value.filter((v) => v !== "WORLD" && v !== "EU"), code]);
  }

  const label =
    value.length === 0
      ? null
      : value.length === 1
        ? (() => {
            const opt = options.find((o) => o.code === value[0]);
            return opt ? `${opt.flag} ${opt.name}` : value[0];
          })()
        : value.map((code) => options.find((o) => o.code === code)?.flag ?? code).join("  ");

  const labelClass =
    variant === "frontend"
      ? "block text-sm font-medium text-[var(--ds-text-muted)] mb-1.5"
      : formLabelClass;

  return (
    <div>
      <span className={labelClass}>{messages.label}</span>

      <ControlTrigger
        className={buttonClassName}
        controls={listboxId}
        invalid={Boolean(error)}
        onClick={() => setOpen((current) => !current)}
        open={open}
        ref={buttonRef}
        trailingIcon={
          open ? (
            <CaretUpIcon weight="duotone" className="size-4" />
          ) : (
            <CaretDownIcon weight="duotone" className="size-4" />
          )
        }
      >
        <span
          className={`truncate ${label ? "text-[var(--ds-text)]" : "text-[var(--ds-text-subtle)]"}`}
        >
          {label ?? messages.placeholder}
        </span>
      </ControlTrigger>

      <ListboxPopover
        className="max-h-[360px] overflow-y-auto py-1"
        closeOnSelect={false}
        listboxId={listboxId}
        onOpenChange={setOpen}
        onSelect={(code) => toggle(code as RegionCode)}
        open={open}
        optionValues={optionValues}
        selectedValue={value[0]}
        triggerRef={buttonRef}
      >
        {options.map(({ code, flag, name }) => {
          const checked = value.includes(code);
          return (
            <ListboxOption
              key={code}
              value={code}
              selected={checked}
              leadingIcon={
                <span
                  className={`flex size-4 shrink-0 items-center justify-center rounded border transition-colors ${
                    checked
                      ? "border-[var(--color-primary)] bg-[var(--color-primary)]"
                      : "border-[var(--ds-border-strong)]"
                  }`}
                >
                  {checked && <CheckIcon weight="duotone" className="size-2.5 text-white" />}
                </span>
              }
            >
              <span className="inline-flex min-w-0 items-center gap-1.5">
                <span>{flag}</span>
                <span className="truncate">{name}</span>
              </span>
            </ListboxOption>
          );
        })}
      </ListboxPopover>

      {error && <p className="text-[var(--ds-danger-text)] text-xs mt-1.5">{error}</p>}
    </div>
  );
}
