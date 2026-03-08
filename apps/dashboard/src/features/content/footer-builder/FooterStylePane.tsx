import type { FooterStyle } from "@lmaa/contracts";
import { FOOTER_STYLE_DEFAULTS } from "@lmaa/contracts";

import { Card } from "@/components/ui/Card.tsx";
import { SegmentSwitch } from "@/components/ui/SegmentSwitch.tsx";

const labelClass = "text-xs font-semibold text-[var(--ds-text-subtle)] uppercase tracking-wider";

const COLOR_FIELDS: { key: keyof FooterStyle; label: string }[] = [
  { key: "bgColor", label: "Hintergrund" },
  { key: "textColor", label: "Text" },
  { key: "headlineColor", label: "Überschriften" },
  { key: "linkColor", label: "Links" },
  { key: "linkHoverColor", label: "Link Hover" },
  { key: "buttonColor", label: "Button-Farbe" },
  { key: "buttonTextColor", label: "Button-Text" },
];

const PADDING_OPTIONS = [
  { value: "sm" as const, label: "Klein" },
  { value: "md" as const, label: "Normal" },
  { value: "lg" as const, label: "Groß" },
  { value: "xl" as const, label: "Sehr groß" },
];

interface Props {
  style: FooterStyle;
  onChange: (updated: FooterStyle) => void;
}

export function FooterStylePane({ style, onChange }: Props) {
  const s = { ...FOOTER_STYLE_DEFAULTS, ...style };

  return (
    <Card className="flex flex-col gap-4 p-4">
      <div className="flex items-center gap-2 pb-3 border-b border-[var(--ds-border)]">
        <span className="text-sm font-semibold text-[var(--ds-text)]">Stil</span>
      </div>

      {COLOR_FIELDS.map(({ key, label }) => (
        <label key={key} className="flex items-center justify-between gap-3">
          <span className={labelClass}>{label}</span>
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={s[key] as string}
              onChange={(e) => onChange({ ...s, [key]: e.target.value })}
              className="w-8 h-8 rounded-control border border-[var(--ds-border)] cursor-pointer bg-transparent"
            />
            <input
              type="text"
              value={s[key] as string}
              onChange={(e) => onChange({ ...s, [key]: e.target.value })}
              className="h-8 w-24 px-2 rounded-control border border-[var(--ds-border)] bg-[var(--ds-input-bg)] text-xs text-[var(--ds-text)] font-mono focus:outline-none focus:border-[var(--color-primary)]"
              spellCheck={false}
            />
          </div>
        </label>
      ))}

      <div className="flex flex-col gap-2">
        <span className={labelClass}>Höhe (Padding)</span>
        <SegmentSwitch
          value={s.paddingY}
          onChange={(v) => onChange({ ...s, paddingY: v })}
          options={PADDING_OPTIONS}
        />
      </div>
    </Card>
  );
}
