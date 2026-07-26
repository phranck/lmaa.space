import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

import type { FooterBlock } from "@lmaa/contracts";

import { useI18n } from "@/context/I18nContext.tsx";

const BLOCK_ABBR: Record<FooterBlock["type"], string> = {
  headline: "H",
  text: "Md",
  button: "Btn",
  "footer-nav": "Nav",
  separator: "—",
  spacer: "↕",
  "social-media": "SM",
};

function getBlockLabel(
  block: FooterBlock,
  labels: Record<FooterBlock["type"], string>,
): string {
  if (block.type === "headline") return block.text || labels.headline;
  if (block.type === "button") return block.label || labels.button;
  return labels[block.type];
}

interface Props {
  block: FooterBlock;
  columnId: string;
  isSelected: boolean;
  onSelect: () => void;
  onDelete: () => void;
}

/**
 * Sortable block card displayed inside a footer canvas column.
 * Follows the same patterns as BuilderField in the form builder.
 */
export function FooterBlockItem({ block, columnId, isSelected, onSelect, onDelete }: Props) {
  const { messages } = useI18n();
  const labels: Record<FooterBlock["type"], string> = {
    headline: messages.content.footerBuilder.blockLabels.headline,
    text: messages.content.footerBuilder.blockLabels.markdown,
    button: messages.content.footerBuilder.blockLabels.button,
    "footer-nav": messages.content.footerBuilder.blockLabels.footerNav,
    separator: messages.content.footerBuilder.blockLabels.separator,
    spacer: messages.content.footerBuilder.blockLabels.spacer,
    "social-media": messages.content.footerBuilder.blockLabels.socialMedia,
  };
  const sortableId = `block:${columnId}:${block.id}`;
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: sortableId,
    data: { blockId: block.id, columnId },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="group/block relative w-full"
    >
      <button
        type="button"
        {...attributes}
        {...listeners}
        onClick={onSelect}
        className={`flex w-full cursor-pointer items-center gap-2 rounded-control border px-3 py-2.5 text-sm ${
          isSelected
            ? "border-[var(--color-primary)] bg-[var(--ds-nav-active-bg)]"
            : "border-[var(--ds-border)] bg-[var(--ds-input-bg)] hover:border-[var(--color-primary)]"
        }`}
      >
        <span className="flex-1 min-w-0 truncate font-medium text-[var(--ds-text)]">
          {getBlockLabel(block, labels)}
        </span>
        <span className="shrink-0 px-1.5 py-0.5 rounded text-xs font-medium bg-[var(--ds-border-subtle)] text-[var(--ds-text)]/60">
          {BLOCK_ABBR[block.type]}
        </span>
      </button>

      <button
        type="button"
        aria-label={messages.content.footerBuilder.removeBlock}
        onClick={(e) => {
          e.stopPropagation();
          onDelete();
        }}
        className="absolute -top-3 -right-3 w-6 h-6 flex items-center justify-center rounded-full bg-[var(--ds-surface)] text-[var(--ds-text-subtle)] hover:text-[var(--ds-danger-text)] opacity-0 group-hover/block:opacity-100"
      >
        <svg width="20" height="20" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
          <path
            fillRule="evenodd"
            d="M8 15A7 7 0 1 0 8 1a7 7 0 0 0 0 14zm2.78-4.22a.75.75 0 0 1-1.06 0L8 9.06l-1.72 1.72a.75.75 0 1 1-1.06-1.06L6.94 8 5.22 6.28a.75.75 0 0 1 1.06-1.06L8 6.94l1.72-1.72a.75.75 0 1 1 1.06 1.06L9.06 8l1.72 1.72a.75.75 0 0 1 0 1.06z"
          />
        </svg>
      </button>
    </div>
  );
}
