import type { ReactNode } from "react";
import { useEffect, useRef } from "react";

import { DashboardSegmentedControl } from "@/components/ui/DashboardControls.tsx";

interface SegmentOption<T extends string> {
  badge?: ReactNode;
  icon?: ReactNode;
  label?: ReactNode;
  value: T;
}

interface SegmentedControlProps<T extends string> {
  onChange: (value: T) => void;
  options: readonly SegmentOption<T>[];
  storageKey?: string;
  value: T;
}

/**
 * Dashboard segmented control wrapper with optional localStorage restore.
 *
 * @typeParam T - Literal union of option values.
 * @param props - Options, current value, storage key and selection callback.
 * @returns Segmented toggle component.
 */
export function SegmentedControl<T extends string>({
  onChange,
  options,
  storageKey,
  value,
}: SegmentedControlProps<T>) {
  const restoredRef = useRef(false);

  useEffect(() => {
    if (restoredRef.current || !storageKey || typeof window === "undefined") {
      return;
    }
    restoredRef.current = true;
    try {
      const stored = window.localStorage.getItem(storageKey);
      if (!stored) {
        return;
      }
      const hasStoredValue = options.some((option) => option.value === stored);
      if (!hasStoredValue) {
        window.localStorage.removeItem(storageKey);
        return;
      }
      if (stored !== value) {
        onChange(stored as T);
      }
    } catch {}
  }, [onChange, options, storageKey, value]);

  useEffect(() => {
    if (!storageKey || typeof window === "undefined") {
      return;
    }
    try {
      const hasValue = options.some((option) => option.value === value);
      if (!hasValue) {
        window.localStorage.removeItem(storageKey);
        return;
      }
      window.localStorage.setItem(storageKey, value);
    } catch {}
  }, [options, storageKey, value]);

  return <DashboardSegmentedControl onValueChange={onChange} options={options} value={value} />;
}
