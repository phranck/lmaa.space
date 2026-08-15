import { SubtextCheckbox } from "@/components/ui/SubtextCheckbox.tsx";

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
  return <SubtextCheckbox checked={checked} onChange={onChange} label={label} description={hint} />;
}
