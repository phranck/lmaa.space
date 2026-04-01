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
  const [collapsedHeight, setCollapsedHeight] = useState(0);
  const [expandedHeight, setExpandedHeight] = useState(0);

  useLayoutEffect(() => {
    setCollapsedHeight(collapsedMeasureRef.current?.getBoundingClientRect().height ?? 0);
    setExpandedHeight(expandedMeasureRef.current?.getBoundingClientRect().height ?? 0);
  }, [collapsedContent, expandedContent]);

  useEffect(
    () => () => {
      if (timeoutRef.current) {
        window.clearTimeout(timeoutRef.current);
      }
    },
    [],
  );

  useEffect(() => {
    if (!canCollapse) {
      setExpanded(false);
      setAnimatedHeight(null);
    }
  }, [canCollapse]);

  function toggleExpanded() {
    if (!canCollapse) return;
    if (timeoutRef.current) {
      window.clearTimeout(timeoutRef.current);
    }

    const from = expanded ? expandedHeight : collapsedHeight;
    const to = expanded ? collapsedHeight : expandedHeight;
    setAnimatedHeight(from);
    setExpanded((current) => !current);

    requestAnimationFrame(() => {
      setAnimatedHeight(to);
    });

    timeoutRef.current = window.setTimeout(() => {
      setAnimatedHeight(null);
    }, COLLAPSIBLE_ANIMATION_MS);
  }

  const visibleContent = expanded ? expandedContent : collapsedContent;

  return (
    <>
      <div
        className="overflow-hidden transition-[height] duration-300 ease-in-out"
        style={animatedHeight === null ? undefined : { height: animatedHeight }}
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
          aria-expanded={expanded}
          className="self-start inline-flex items-center gap-1.5 text-sm font-medium text-[var(--color-primary)] hover:text-[var(--color-primary-hover)]"
        >
          <CaretDownIcon
            weight="duotone"
            className={`w-3.5 h-3.5 transition-transform duration-200 ease-out ${expanded ? "rotate-180" : ""}`}
          />
          {expanded ? analyticsMessages.showLessRows : analyticsMessages.showAllRows}
        </button>
      )}
    </>
  );
}
