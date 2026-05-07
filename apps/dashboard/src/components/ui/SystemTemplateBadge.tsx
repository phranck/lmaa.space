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
      <LockIcon weight="duotone" className="h-2.5 w-2.5" />
      {label}
    </span>
  );
}

interface SystemTemplateCheckboxProps {
  checked: boolean;
  onChange: (value: boolean) => void;
  label: string;
  hint?: string;
}

/**
 * Owner-only checkbox for toggling the system-template flag.
 * Must only be rendered when the current user `isOwner === true`.
 */
export function SystemTemplateCheckbox({
  checked,
  onChange,
  label,
  hint,
}: SystemTemplateCheckboxProps) {
  return (
    <label className="flex cursor-pointer items-start gap-2">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-0.5 h-4 w-4 rounded border-[var(--ds-border)] accent-[var(--color-primary)]"
      />
      <span className="space-y-0.5">
        <span className="block text-sm font-medium text-[var(--ds-text)]">{label}</span>
        {hint && <span className="block text-xs text-[var(--ds-text-muted)]">{hint}</span>}
      </span>
    </label>
  );
}
