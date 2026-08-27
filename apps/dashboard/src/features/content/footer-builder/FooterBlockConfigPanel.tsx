import { closestCenter, DndContext, type DragEndEvent } from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { ListIcon } from "@phosphor-icons/react";
import { Suspense, lazy } from "react";

import type { FooterBlock, SocialMediaBlock } from "@lmaa/contracts";
import { DashboardSection } from "@lmaa/ui/dashboard-section";
import { PLATFORM_MAP } from "@lmaa/ui/social-media-platforms";

const MarkdownEditor = lazy(() =>
  import("@lmaa/ui/markdown-editor").then((m) => ({ default: m.MarkdownEditor })),
);

import { DashboardCheckboxField, DashboardInput } from "@/components/ui/DashboardControls.tsx";
import { SegmentSwitch } from "@/components/ui/SegmentSwitch.tsx";
import { useDashboardSortableSensors } from "@/components/ui/useDashboardSortableSensors.ts";
import { useI18n } from "@/context/I18nContext.tsx";
import { FooterBlockTypeIcon } from "@/features/content/footer-builder/FooterPalette.tsx";
import { useFooterEligibleAccounts } from "@/features/social/hooks/useSocialMediaAccounts.ts";

const IconPicker = lazy(() =>
  import("@/components/ui/IconPicker.tsx").then((module) => ({ default: module.IconPicker })),
);

const labelClass = "text-xs font-semibold text-[var(--ds-text-label)] uppercase tracking-wider";

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
    <DashboardSection className="min-w-64">
      <DashboardSection.Header
        icon={<FooterBlockTypeIcon type={block.type} />}
        title={blockTypeLabels[block.type]}
      />
      <DashboardSection.Body className="!gap-4">
        {block.type === "separator" && (
          <p className="text-xs text-[var(--ds-text-hint)] italic">{footerMessages.noSettings}</p>
        )}

        {block.type === "spacer" && (
          <p className="text-xs text-[var(--ds-text-hint)] italic">{footerMessages.spacerHint}</p>
        )}

        {block.type === "headline" && (
          <label className="flex flex-col gap-1">
            <span className={labelClass}>{footerMessages.headlineTextLabel}</span>
            <DashboardInput
              type="text"
              value={block.text}
              onChange={(e) => onChange({ ...block, text: e.target.value })}
            />
          </label>
        )}

        {block.type === "text" && (
          <div className="flex flex-col gap-1">
            <span className={labelClass}>{footerMessages.contentLabel}</span>
            <Suspense
              fallback={
                <div className="h-[180px] rounded-control border border-[var(--ds-border)] bg-[var(--ds-input-bg)] animate-pulse" />
              }
            >
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
              <DashboardInput
                type="text"
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
              <DashboardInput
                type="text"
                autoComplete="off"
                value={block.href}
                onChange={(e) => onChange({ ...block, href: e.target.value })}
                placeholder={footerMessages.urlPlaceholder}
              />
            </label>

            <div className="flex flex-col gap-1">
              <span className={labelClass}>{footerMessages.styleLabel}</span>
              <SegmentSwitch
                value={block.style ?? "filled"}
                onChange={(value) => onChange({ ...block, style: value })}
                options={buttonStyleOptions}
              />
            </div>

            <DashboardCheckboxField
              checked={block.external}
              onCheckedChange={(checked) => onChange({ ...block, external: checked })}
              label={footerMessages.externalLink}
              className="items-center"
              boxClassName="mt-0"
            />
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
      </DashboardSection.Body>
    </DashboardSection>
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
  const sensors = useDashboardSortableSensors({ activationDistance: 4 });

  // block.order acts as an ordering hint, not a whitelist: accounts added
  // after the order was saved appear at the end; orphan keys (account removed
  // or showInFooter toggled off) drop out.
  const accountKeys: string[] = accounts.map((a) => a.platform);
  const accountKeySet = new Set(accountKeys);
  const ordered = (block.order ?? []).filter((key) => accountKeySet.has(key));
  const orderedSet = new Set(ordered);
  const remaining = accountKeys.filter((key) => !orderedSet.has(key));
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
        <p className="text-xs italic text-[var(--ds-text-hint)]">{emptyHint}</p>
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
      <ListIcon className="size-4 shrink-0 text-[var(--ds-text-subtle)]" weight="bold" />
      {Icon ? <Icon size={16} /> : null}
      <span className="flex-1 truncate">{def?.label ?? platform}</span>
      <span className="shrink-0 text-xs text-[var(--ds-text-hint)]">{label}</span>
    </li>
  );
}
