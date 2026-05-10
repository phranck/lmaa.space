import { LockIcon } from "@phosphor-icons/react";

interface SystemTemplateBadgeProps {
  label: string;
}

/**
 * Read-only badge displayed next to system-template names in list and edit views.
 */
export function SystemTemplateBadge({ label }: SystemTemplateBadgeProps) {
  return (
    <span className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-xs bg-[var(--ds-surface-hover)] text-[var(--ds-text-muted)]">
      <LockIcon weight="duotone" className="size-2.5" />
      {label}
    </span>
  );
}
