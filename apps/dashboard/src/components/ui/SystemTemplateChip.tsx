import { LockIcon } from "@phosphor-icons/react";

import { Chip } from "@/components/ui/Chip.tsx";

interface SystemTemplateChipProps {
  label: string;
}

/**
 * Marks a template the product ships and nobody may delete.
 *
 * @param label - What the chip reads, in the reader's language.
 * @returns The chip.
 *
 * @remarks
 * A chip rather than a status badge, because it names what the template is and
 * not how it is doing. The lock says the same thing a second way, so the mark
 * still reads for somebody who cannot tell this grey from the coloured ones.
 */
export function SystemTemplateChip({ label }: SystemTemplateChipProps) {
  return <Chip icon={<LockIcon weight="duotone" className="size-3" />}>{label}</Chip>;
}
