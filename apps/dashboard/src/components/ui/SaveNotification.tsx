import { CheckCircleIcon } from "@phosphor-icons/react";
import { useCallback, useEffect, useRef, useState } from "react";

type Phase = "hidden" | "entering" | "visible" | "exiting";

const DISPLAY_DURATION = 5000;
const ANIMATION_DURATION = 250;

/**
 * Manages the lifecycle of a transient save notification.
 *
 * @returns `show` to trigger the notification and `phase` for rendering.
 */
export function useSaveNotification() {
  const [phase, setPhase] = useState<Phase>("hidden");
  const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  const show = useCallback(() => {
    clearTimeout(timerRef.current);
    setPhase("entering");
    timerRef.current = setTimeout(() => {
      setPhase("visible");
      timerRef.current = setTimeout(() => {
        setPhase("exiting");
        timerRef.current = setTimeout(() => setPhase("hidden"), ANIMATION_DURATION);
      }, DISPLAY_DURATION);
    }, ANIMATION_DURATION);
  }, []);

  useEffect(() => () => clearTimeout(timerRef.current), []);

  return { phase, show };
}

interface SaveNotificationProps {
  phase: Phase;
  label: string;
}

/**
 * Animated "Saved" badge meant for dialog headers (absolute top-right).
 *
 * @param props - `phase` from `useSaveNotification` and the display label.
 * @returns Positioned notification element or null.
 */
export function SaveNotification({ phase, label }: SaveNotificationProps) {
  if (phase === "hidden") return null;

  return (
    <span
      className={`flex items-center gap-1.5 text-xs font-medium text-green-500 save-notification-${phase === "exiting" ? "exit" : "enter"}`}
    >
      <CheckCircleIcon weight="duotone" className="w-3.5 h-3.5" />
      {label}
    </span>
  );
}
