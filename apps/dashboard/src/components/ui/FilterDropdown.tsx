import { useEffect, useRef } from "react";

import { Dropdown, type DropdownOption } from "@/components/ui/Dropdown.tsx";

interface FilterDropdownProps<T extends string = string> {
  value: T;
  onChange: (value: T) => void;
  options: DropdownOption<T>[];
  storageKey?: string;
  className?: string;
  searchable?: boolean;
  searchPlaceholder?: string;
}

/**
 * Shared filter dropdown with optional localStorage persistence.
 */
export function FilterDropdown<T extends string = string>({
  value,
  onChange,
  options,
  storageKey,
  className,
  searchable,
  searchPlaceholder,
}: FilterDropdownProps<T>) {
  const restoredRef = useRef(false);

  useEffect(() => {
    if (restoredRef.current || !storageKey || typeof window === "undefined") return;
    restoredRef.current = true;
    try {
      const stored = window.localStorage.getItem(storageKey);
      if (!stored) return;
      const hasStoredValue = options.some((option) => option.value === stored);
      if (!hasStoredValue) {
        window.localStorage.removeItem(storageKey);
        return;
      }
      if (stored !== value) onChange(stored as T);
    } catch {}
  }, [onChange, options, storageKey, value]);

  useEffect(() => {
    if (!storageKey || typeof window === "undefined") return;
    try {
      const hasValue = options.some((option) => option.value === value);
      if (!hasValue) {
        window.localStorage.removeItem(storageKey);
        return;
      }
      window.localStorage.setItem(storageKey, value);
    } catch {}
  }, [options, storageKey, value]);

  return <Dropdown value={value} onChange={onChange} options={options} className={className ?? "w-52"} searchable={searchable} searchPlaceholder={searchPlaceholder} />;
}
