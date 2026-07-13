import { CaretDownIcon } from "@phosphor-icons/react";
import { type ReactNode, useEffect, useLayoutEffect, useRef, useState } from "react";

import { useI18n } from "@/context/I18nContext.tsx";
import { COLLAPSIBLE_ANIMATION_MS } from "@/features/analytics/analytics-utils.ts";

interface CollapsibleListProps {
  collapsedContent: ReactNode;
  expandedContent: ReactNode;
  canCollapse: boolean;
}

export function CollapsibleList({
  collapsedContent,
  expandedContent,
  canCollapse,
}: CollapsibleListProps) {
  const { messages } = useI18n();
  const analyticsMessages = messages.dashboard.analytics;
  const [expanded, setExpanded] = useState(false);
  const [animatedHeight, setAnimatedHeight] = useState<number | null>(null);
  const collapsedMeasureRef = useRef<HTMLDivElement>(null);
  const expandedMeasureRef = useRef<HTMLDivElement>(null);
  const timeoutRef = useRef<number | null>(null);
  const collapsedHeightRef = useRef(0);
  const expandedHeightRef = useRef(0);

  useLayoutEffect(() => {
    collapsedHeightRef.current = collapsedMeasureRef.current?.getBoundingClientRect().height ?? 0;
    expandedHeightRef.current = expandedMeasureRef.current?.getBoundingClientRect().height ?? 0;
  }, [collapsedContent, expandedContent]);

  useEffect(
    () => () => {
      if (timeoutRef.current) {
        window.clearTimeout(timeoutRef.current);
      }
    },
    [],
  );

  function toggleExpanded() {
    if (!canCollapse) return;
    if (timeoutRef.current) {
      window.clearTimeout(timeoutRef.current);
    }

    const from = effectiveExpanded ? expandedHeightRef.current : collapsedHeightRef.current;
    const to = effectiveExpanded ? collapsedHeightRef.current : expandedHeightRef.current;
    setAnimatedHeight(from);
    setExpanded((current) => !current);

    requestAnimationFrame(() => {
      setAnimatedHeight(to);
    });

    timeoutRef.current = window.setTimeout(() => {
      setAnimatedHeight(null);
    }, COLLAPSIBLE_ANIMATION_MS);
  }

  const effectiveExpanded = canCollapse && expanded;
  const visibleContent = effectiveExpanded ? expandedContent : collapsedContent;
  const effectiveAnimatedHeight = canCollapse ? animatedHeight : null;

  return (
    <>
      <div
        className="overflow-hidden transition-[height] duration-300 ease-in-out"
        style={effectiveAnimatedHeight === null ? undefined : { height: effectiveAnimatedHeight }}
      >
        {visibleContent}
      </div>

      <div className="sr-only pointer-events-none absolute -left-[9999px] top-0 opacity-0">
        <div ref={collapsedMeasureRef}>{collapsedContent}</div>
        <div ref={expandedMeasureRef}>{expandedContent}</div>
      </div>

      {canCollapse && (
        <button
          type="button"
          onClick={toggleExpanded}
          aria-expanded={effectiveExpanded}
          className="self-start inline-flex items-center gap-1.5 text-sm font-medium text-[var(--color-primary)] hover:text-[var(--color-primary-hover)]"
        >
          <CaretDownIcon
            weight="duotone"
            className={`w-3.5 h-3.5 transition-transform duration-200 ease-out ${effectiveExpanded ? "rotate-180" : ""}`}
          />
          {effectiveExpanded ? analyticsMessages.showLessRows : analyticsMessages.showAllRows}
        </button>
      )}
    </>
  );
}
