import { useCallback, useRef } from "react";

/**
 * Returns a debounced version of the given callback.
 *
 * The returned function delays invocation until `delay` ms have passed since the
 * last call. Useful for search inputs and filter changes that trigger API requests.
 *
 * @param callback - The function to debounce.
 * @param delay - Debounce delay in milliseconds (default: 400).
 */
export function useDebouncedCallback<T extends (...args: never[]) => void>(
  callback: T,
  delay = 400,
): (...args: Parameters<T>) => void {
  const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  return useCallback(
    (...args: Parameters<T>) => {
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => callback(...args), delay);
    },
    [callback, delay],
  );
}
