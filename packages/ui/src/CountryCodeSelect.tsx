import { CaretDownIcon, CaretUpIcon, CheckIcon } from "@phosphor-icons/react";
import { useId, useRef, useState } from "react";

import type { CountryCodeOption } from "./CountryCodeOptions.ts";
import { formLabelClass } from "./FormPrimitiveStyles.ts";
import { ControlTrigger, ListboxOption, ListboxPopover } from "./ListboxPrimitives.tsx";

export interface CountryCodeSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: ReadonlyArray<CountryCodeOption>;
  label: string;
  placeholder: string;
  error?: string;
}

export function CountryCodeSelect({
  value,
  onChange,
  options,
  label,
  placeholder,
  error,
}: CountryCodeSelectProps) {
  const [open, setOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const listboxId = useId();
  const optionValues = options.map((option) => option.code);

  const selectedOption = options.find((option) => option.code === value);

  return (
    <div>
      <span className={formLabelClass}>{label}</span>
      <ControlTrigger
        controls={listboxId}
        invalid={Boolean(error)}
        onClick={() => setOpen((current) => !current)}
        open={open}
        placeholder={placeholder}
        ref={buttonRef}
        trailingIcon={
          open ? (
            <CaretUpIcon weight="duotone" className="size-4" />
          ) : (
            <CaretDownIcon weight="duotone" className="size-4" />
          )
        }
      >
        {selectedOption ? (
          <span className="flex min-w-0 items-center gap-2 text-[var(--ds-text)]">
            <span className="text-base leading-none">{selectedOption.flag}</span>
            <span className="font-medium truncate">{selectedOption.code}</span>
          </span>
        ) : null}
      </ControlTrigger>
      <ListboxPopover
        className="max-h-[360px] overflow-y-auto py-1"
        listboxId={listboxId}
        matchTriggerWidth={false}
        onOpenChange={setOpen}
        onSelect={onChange}
        open={open}
        optionValues={optionValues}
        selectedValue={value}
        style={{ width: "min(360px, calc(100vw - 24px))" }}
        triggerRef={buttonRef}
      >
        {options.map(({ code, flag, name }) => {
          const checked = code === value;
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
              <span className="inline-flex min-w-0 items-center gap-2">
                <span className="text-base leading-none">{flag}</span>
                <span className="font-medium text-[var(--ds-text)]">{code}</span>
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
