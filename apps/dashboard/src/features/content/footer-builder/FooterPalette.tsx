import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { ShareNetworkIcon } from "@phosphor-icons/react";

import type { FooterBlock } from "@lmaa/contracts";

import { Card } from "@/components/ui/Card.tsx";
import { useI18n } from "@/context/I18nContext.tsx";
import { FieldTypeIcon } from "@/features/templates/form-builder/FieldPalette.tsx";

type FooterBlockType = FooterBlock["type"];

/**
 * Renders an icon for each footer block type.
 * Reuses FieldTypeIcon for shared types (headline, button, separator).
 */
export function FooterBlockTypeIcon({ type }: { type: FooterBlockType }) {
  if (type === "text") return <FieldTypeIcon type="richtext" />;
  if (type === "footer-nav") {
    return (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
        <path
          d="M2 4h12M2 8h8M2 12h5"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
      </svg>
    );
  }
  if (type === "social-media") return <ShareNetworkIcon size={16} weight="duotone" />;
  return <FieldTypeIcon type={type} />;
}

function PaletteTile({ type, label }: { type: FooterBlockType; label: string }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `palette:${type}`,
    data: { type },
  });

  const style = transform
    ? { transform: CSS.Translate.toString(transform), opacity: isDragging ? 0.5 : 1 }
    : undefined;

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className="flex items-center gap-2 px-3 py-2.5 rounded-control border border-[var(--ds-border)] bg-[var(--ds-surface)] text-sm text-[var(--ds-text)] cursor-grab active:cursor-grabbing hover:border-[var(--color-primary)] hover:bg-[var(--ds-nav-hover-bg)] select-none"
    >
      <span className="shrink-0 opacity-60">
        <FooterBlockTypeIcon type={type} />
      </span>
      <span className="font-medium">{label}</span>
    </div>
  );
}

export function FooterPalette() {
  const { messages } = useI18n();
  const footerMessages = messages.content.footerBuilder;
  const paletteBlocks: { type: FooterBlockType; label: string }[] = [
    { type: "button", label: footerMessages.blockLabels.button },
    { type: "footer-nav", label: footerMessages.blockLabels.footerNav },
    { type: "headline", label: footerMessages.blockLabels.headline },
    { type: "text", label: footerMessages.blockLabels.markdown },
    { type: "separator", label: footerMessages.blockLabels.separator },
    { type: "social-media", label: footerMessages.blockLabels.socialMedia },
  ];

  return (
    <Card className="flex flex-col gap-4 p-4 min-w-44">
      <div className="flex flex-col gap-1.5">
        <p className="text-xs font-semibold uppercase tracking-wider text-[var(--ds-text-subtle)] mb-1 px-1">
          {footerMessages.paletteTitle}
        </p>
        {paletteBlocks.map(({ type, label }) => (
          <PaletteTile key={type} type={type} label={label} />
        ))}
      </div>
    </Card>
  );
}
