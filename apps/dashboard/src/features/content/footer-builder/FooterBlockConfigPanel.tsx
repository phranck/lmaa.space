import {
  closestCenter,
  DndContext,
  type DragEndEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { DotsSixVerticalIcon } from "@phosphor-icons/react";
import { Suspense, lazy } from "react";

import type { FooterBlock, SocialMediaBlock } from "@lmaa/contracts";
import { PLATFORM_MAP } from "@lmaa/ui";

const MarkdownEditor = lazy(() =>
  import("@lmaa/ui").then((m) => ({ default: m.MarkdownEditor })),
);

import { Card } from "@/components/ui/Card.tsx";
import { SegmentSwitch } from "@/components/ui/SegmentSwitch.tsx";
import { useI18n } from "@/context/I18nContext.tsx";
import { FooterBlockTypeIcon } from "@/features/content/footer-builder/FooterPalette.tsx";
import { useFooterEligibleAccounts } from "@/features/social/hooks/useSocialMediaAccounts.ts";

const IconPicker = lazy(() =>
  import("@/components/ui/IconPicker.tsx").then((module) => ({ default: module.IconPicker })),
);

const labelClass = "text-xs font-semibold text-[var(--ds-text-subtle)] uppercase tracking-wider";
const inputClass =
  "h-9 px-3 rounded-control border border-[var(--ds-border)] bg-[var(--ds-input-bg)] text-sm text-[var(--ds-text)] focus:outline-none focus:border-[var(--color-primary)]";

interface Props {
  block: FooterBlock;
  onChange: (updated: FooterBlock) => void;
}

/**
 * Properties editor for a selected footer block.
 * Follows the same patterns as FieldConfigPanel in the form builder.
 */
export function FooterBlockConfigPanel({ block, onChange }: Props) {
  const { messages } = useI18n();
  const buttonMessages = messages.formBuilder.panel;
  const footerMessages = messages.content.footerBuilder;
  const blockTypeLabels: Record<FooterBlock["type"], string> = {
    headline: footerMessages.blockLabels.headline,
    text: footerMessages.blockLabels.markdown,
    button: footerMessages.blockLabels.button,
    "footer-nav": footerMessages.blockLabels.footerNav,
    separator: footerMessages.blockLabels.separator,
    spacer: footerMessages.blockLabels.spacer,
    "social-media": footerMessages.blockLabels.socialMedia,
  };
  const buttonStyleOptions = [
    { value: "filled" as const, label: footerMessages.styleOptions.filled },
    { value: "outline" as const, label: footerMessages.styleOptions.outline },
    { value: "ghost" as const, label: footerMessages.styleOptions.ghost },
  ];

  return (
    <Card className="flex flex-col gap-4 p-4 min-w-64">
      {/* Header: type icon + label */}
      <div className="flex items-center gap-2 pb-3 border-b border-[var(--ds-border)]">
        <span className="text-[var(--ds-text-subtle)]">
          <FooterBlockTypeIcon type={block.type} />
        </span>
        <span className="text-sm font-semibold text-[var(--ds-text)]">
          {blockTypeLabels[block.type]}
        </span>
      </div>

      {block.type === "separator" && (
        <p className="text-xs text-[var(--ds-text-subtle)] italic">{footerMessages.noSettings}</p>
      )}

      {block.type === "spacer" && (
        <p className="text-xs text-[var(--ds-text-subtle)] italic">{footerMessages.spacerHint}</p>
      )}

      {block.type === "headline" && (
        <label className="flex flex-col gap-1">
          <span className={labelClass}>{footerMessages.headlineTextLabel}</span>
          <input
            type="text"
            className={inputClass}
            value={block.text}
            onChange={(e) => onChange({ ...block, text: e.target.value })}
          />
        </label>
      )}

      {block.type === "text" && (
        <div className="flex flex-col gap-1">
          <span className={labelClass}>{footerMessages.contentLabel}</span>
          <Suspense fallback={<div className="h-[180px] rounded-control border border-[var(--ds-border)] bg-[var(--ds-input-bg)] animate-pulse" />}>
            <MarkdownEditor
              value={block.markdown}
              onChange={(v) => onChange({ ...block, markdown: v })}
              height="180px"
              showHints={false}
            />
          </Suspense>
        </div>
      )}

      {block.type === "button" && (
        <>
          <label className="flex flex-col gap-1">
            <span className={labelClass}>{footerMessages.buttonLabelField}</span>
            <input
              type="text"
              className={inputClass}
              value={block.label ?? ""}
              onChange={(e) => onChange({ ...block, label: e.target.value || undefined })}
              placeholder={footerMessages.buttonLabelPlaceholder}
            />
          </label>

          <Suspense
            fallback={
              <div className="h-48 rounded-control border border-[var(--ds-border)] bg-[var(--ds-input-bg)] animate-pulse" />
            }
          >
            <IconPicker
              value={block.icon}
              onChange={(icon) => onChange({ ...block, icon })}
              label={buttonMessages.buttonIcon}
              noneLabel={buttonMessages.buttonIconNone}
            />
          </Suspense>

          <label className="flex flex-col gap-1">
            <span className={labelClass}>{footerMessages.urlLabel}</span>
            <input
              type="text"
              autoComplete="off"
              className={inputClass}
              value={block.href}
              onChange={(e) => onChange({ ...block, href: e.target.value })}
              placeholder={footerMessages.urlPlaceholder}
            />
          </label>

          <div className="flex flex-col gap-1">
            <span className={labelClass}>{footerMessages.styleLabel}</span>
            <div className="flex gap-1.5">
              {buttonStyleOptions.map(({ value, label }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => onChange({ ...block, style: value })}
                  className={`flex-1 h-8 rounded-control border text-xs font-medium ${
                    block.style === value
                      ? "border-[var(--color-primary)] bg-[var(--ds-nav-active-bg)] text-[var(--ds-nav-active-text)]"
                      : "border-[var(--ds-border)] bg-[var(--ds-input-bg)] text-[var(--ds-text)] hover:border-[var(--color-primary)]"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={block.external}
              onChange={(e) => onChange({ ...block, external: e.target.checked })}
              className="w-4 h-4 accent-[var(--color-primary)]"
            />
            <span className="text-sm text-[var(--ds-text)]">{footerMessages.externalLink}</span>
          </label>
        </>
      )}

      {block.type === "footer-nav" && (
        <div className="flex flex-col gap-2">
          <span className={labelClass}>{footerMessages.directionLabel}</span>
          <SegmentSwitch
            value={block.direction ?? "vertical"}
            onChange={(v) => onChange({ ...block, direction: v })}
            options={[
              { value: "vertical" as const, label: footerMessages.directionOptions.vertical },
              {
                value: "horizontal" as const,
                label: footerMessages.directionOptions.horizontal,
              },
            ]}
          />
        </div>
      )}

      {block.type === "social-media" && (
        <>
          <div className="flex flex-col gap-2">
            <span className={labelClass}>{footerMessages.alignLabel}</span>
            <SegmentSwitch
              value={block.align ?? "center"}
              onChange={(v) => onChange({ ...block, align: v })}
              options={[
                { value: "left" as const, label: footerMessages.alignOptions.left },
                { value: "center" as const, label: footerMessages.alignOptions.center },
                { value: "right" as const, label: footerMessages.alignOptions.right },
              ]}
            />
          </div>
          <div className="flex flex-col gap-2">
            <span className={labelClass}>{footerMessages.iconSizeLabel}</span>
            <SegmentSwitch
              value={block.iconSize ?? "md"}
              onChange={(v) => onChange({ ...block, iconSize: v })}
              options={[
                { value: "sm" as const, label: footerMessages.iconSizeOptions.sm },
                { value: "md" as const, label: footerMessages.iconSizeOptions.md },
                { value: "lg" as const, label: footerMessages.iconSizeOptions.lg },
              ]}
            />
          </div>
          <SocialMediaOrderEditor
            block={block}
            onChange={(updated) => onChange(updated)}
            label={footerMessages.iconsLabel}
            emptyHint={footerMessages.iconsEmpty}
          />
        </>
      )}
    </Card>
  );
}

interface SocialMediaOrderEditorProps {
  block: SocialMediaBlock;
  onChange: (updated: SocialMediaBlock) => void;
  label: string;
  emptyHint: string;
}

function SocialMediaOrderEditor({
  block,
  onChange,
  label,
  emptyHint,
}: SocialMediaOrderEditorProps) {
  const { data: accounts = [], isLoading } = useFooterEligibleAccounts();
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));

  // block.order acts as an ordering hint, not a whitelist: accounts added
  // after the order was saved appear at the end; orphan keys (account removed
  // or showInFooter toggled off) drop out.
  const accountKeys: string[] = accounts.map((a) => a.platform);
  const ordered = (block.order ?? []).filter((k) => accountKeys.includes(k));
  const remaining = accountKeys.filter((k) => !ordered.includes(k));
  const currentOrder = [...ordered, ...remaining];

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const ids = currentOrder;
    const oldIndex = ids.indexOf(String(active.id));
    const newIndex = ids.indexOf(String(over.id));
    if (oldIndex < 0 || newIndex < 0) return;
    onChange({ ...block, order: arrayMove(ids, oldIndex, newIndex) });
  }

  return (
    <div className="flex flex-col gap-2">
      <span className={labelClass}>{label}</span>
      {isLoading ? null : currentOrder.length === 0 ? (
        <p className="text-xs italic text-[var(--ds-text-subtle)]">{emptyHint}</p>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={currentOrder} strategy={verticalListSortingStrategy}>
            <ul className="flex flex-col gap-1">
              {currentOrder.map((key) => {
                const acc = accounts.find((a) => a.platform === key);
                if (!acc) return null;
                return <SocialMediaOrderItem key={key} platform={key} label={acc.label} />;
              })}
            </ul>
          </SortableContext>
        </DndContext>
      )}
    </div>
  );
}

function SocialMediaOrderItem({ platform, label }: { platform: string; label: string }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: platform,
  });
  const def = PLATFORM_MAP.get(platform);
  const Icon = def?.icon;
  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };
  return (
    <li
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className="flex cursor-grab items-center gap-2 rounded-control border border-[var(--ds-border)] bg-[var(--ds-input-bg)] px-2 py-1.5 text-sm text-[var(--ds-text)] hover:border-[var(--color-primary)] active:cursor-grabbing"
    >
      <DotsSixVerticalIcon className="h-4 w-4 shrink-0 text-[var(--ds-text-subtle)]" />
      {Icon ? <Icon size={16} /> : null}
      <span className="flex-1 truncate">{def?.label ?? platform}</span>
      <span className="shrink-0 text-xs text-[var(--ds-text-subtle)]">{label}</span>
    </li>
  );
}
