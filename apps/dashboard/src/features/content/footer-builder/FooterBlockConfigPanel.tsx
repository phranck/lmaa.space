import type { FooterBlock } from "@lmaa/contracts";
import { MarkdownEditor } from "@lmaa/ui";

import { Card } from "@/components/ui/Card.tsx";
import { IconPicker } from "@/components/ui/IconPicker.tsx";
import { SegmentSwitch } from "@/components/ui/SegmentSwitch.tsx";
import { useI18n } from "@/context/I18nContext.tsx";
import { FooterBlockTypeIcon } from "@/features/content/footer-builder/FooterPalette.tsx";

const labelClass = "text-xs font-semibold text-[var(--ds-text-subtle)] uppercase tracking-wider";
const inputClass =
  "h-9 px-3 rounded-control border border-[var(--ds-border)] bg-[var(--ds-input-bg)] text-sm text-[var(--ds-text)] focus:outline-none focus:border-[var(--color-primary)]";

const BLOCK_TYPE_LABELS: Record<FooterBlock["type"], string> = {
  headline: "Überschrift",
  text: "Markdown",
  button: "Button",
  "footer-nav": "Footer-Nav",
  separator: "Trennlinie",
};

const BUTTON_STYLE_OPTIONS = [
  { value: "filled" as const, label: "Filled" },
  { value: "outline" as const, label: "Outline" },
  { value: "ghost" as const, label: "Ghost" },
];

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

  return (
    <Card className="flex flex-col gap-4 p-4 min-w-64">
      {/* Header: type icon + label */}
      <div className="flex items-center gap-2 pb-3 border-b border-[var(--ds-border)]">
        <span className="text-[var(--ds-text-subtle)]">
          <FooterBlockTypeIcon type={block.type} />
        </span>
        <span className="text-sm font-semibold text-[var(--ds-text)]">
          {BLOCK_TYPE_LABELS[block.type]}
        </span>
      </div>

      {block.type === "separator" && (
        <p className="text-xs text-[var(--ds-text-subtle)] italic">Keine weiteren Einstellungen.</p>
      )}

      {block.type === "headline" && (
        <label className="flex flex-col gap-1">
          <span className={labelClass}>Text</span>
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
          <span className={labelClass}>Inhalt</span>
          <MarkdownEditor
            value={block.markdown}
            onChange={(v) => onChange({ ...block, markdown: v })}
            height="180px"
            showHints={false}
          />
        </div>
      )}

      {block.type === "button" && (
        <>
          <label className="flex flex-col gap-1">
            <span className={labelClass}>Label</span>
            <input
              type="text"
              className={inputClass}
              value={block.label ?? ""}
              onChange={(e) => onChange({ ...block, label: e.target.value || undefined })}
              placeholder="Button-Text"
            />
          </label>

          <IconPicker
            value={block.icon}
            onChange={(icon) => onChange({ ...block, icon })}
            label={buttonMessages.buttonIcon}
            noneLabel={buttonMessages.buttonIconNone}
          />

          <label className="flex flex-col gap-1">
            <span className={labelClass}>URL</span>
            <input
              type="text"
              className={inputClass}
              value={block.href}
              onChange={(e) => onChange({ ...block, href: e.target.value })}
              placeholder="https://… oder /pfad"
            />
          </label>

          <div className="flex flex-col gap-1">
            <span className={labelClass}>Stil</span>
            <div className="flex gap-1.5">
              {BUTTON_STYLE_OPTIONS.map(({ value, label }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => onChange({ ...block, style: value })}
                  className={`flex-1 h-8 rounded-control border text-xs font-medium transition-colors ${
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
            <span className="text-sm text-[var(--ds-text)]">Externer Link (neuer Tab)</span>
          </label>
        </>
      )}

      {block.type === "footer-nav" && (
        <div className="flex flex-col gap-2">
          <span className={labelClass}>Ausrichtung</span>
          <SegmentSwitch
            value={block.direction ?? "vertical"}
            onChange={(v) => onChange({ ...block, direction: v })}
            options={[
              { value: "vertical" as const, label: "Vertikal" },
              { value: "horizontal" as const, label: "Horizontal" },
            ]}
          />
        </div>
      )}
    </Card>
  );
}
