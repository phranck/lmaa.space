import { FormLabelText } from "@lmaa/ui/form-primitives";

import type { useI18n } from "@/context/I18nContext.tsx";

export interface MediaLinkedContentUsage {
  href: string;
  label: string;
  type: string;
}

interface MediaLinkedContentSectionProps {
  mediaMessages: ReturnType<typeof useI18n>["messages"]["media"];
  usages: MediaLinkedContentUsage[];
}

export function MediaLinkedContentSection({
  mediaMessages,
  usages,
}: MediaLinkedContentSectionProps) {
  if (usages.length === 0) return null;

  return (
    <div className="space-y-2">
      <FormLabelText>{mediaMessages.linkedContentTitle}</FormLabelText>
      <ul className="space-y-1 text-sm">
        {usages.map((usage) => (
          <li key={`${usage.type}:${usage.href}`}>
            <a className="text-[var(--color-primary)] hover:underline" href={usage.href}>
              {usage.label}
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}
