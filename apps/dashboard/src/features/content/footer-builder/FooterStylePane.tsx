import type { FooterStyle } from "@lmaa/contracts";
import { FOOTER_STYLE_DEFAULTS } from "@lmaa/contracts";

import { Card } from "@/components/ui/Card.tsx";
import { DashboardInput } from "@/components/ui/DashboardControls.tsx";
import { SegmentSwitch } from "@/components/ui/SegmentSwitch.tsx";
import { useI18n } from "@/context/I18nContext.tsx";

const labelClass = "text-xs font-semibold text-[var(--ds-text-subtle)] uppercase tracking-wider";

interface Props {
  style: FooterStyle;
  onChange: (updated: FooterStyle) => void;
}

export function FooterStylePane({ style, onChange }: Props) {
  const { messages } = useI18n();
  const footerMessages = messages.content.footerBuilder;
  const s = { ...FOOTER_STYLE_DEFAULTS, ...style };
  const colorFields: { key: keyof FooterStyle; label: string }[] = [
    { key: "bgColor", label: footerMessages.colorFields.background },
    { key: "textColor", label: footerMessages.colorFields.text },
    { key: "headlineColor", label: footerMessages.colorFields.headlines },
    { key: "linkColor", label: footerMessages.colorFields.links },
    { key: "linkHoverColor", label: footerMessages.colorFields.linkHover },
    { key: "buttonColor", label: footerMessages.colorFields.button },
    { key: "buttonTextColor", label: footerMessages.colorFields.buttonText },
  ];
  const sizeOptions = [
    { value: "sm" as const, label: footerMessages.sizeOptions.small },
    { value: "md" as const, label: footerMessages.sizeOptions.medium },
    { value: "lg" as const, label: footerMessages.sizeOptions.large },
    { value: "xl" as const, label: footerMessages.sizeOptions.extraLarge },
  ];

  return (
    <Card className="flex flex-col gap-4 p-4">
      <div className="flex items-center gap-2 pb-3 border-b border-[var(--ds-border)]">
        <span className="text-sm font-semibold text-[var(--ds-text)]">
          {footerMessages.styleTitle}
        </span>
      </div>

      {colorFields.map(({ key, label }) => (
        <label key={key} className="flex items-center justify-between gap-3">
          <span className={labelClass}>{label}</span>
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={s[key] as string}
              onChange={(e) => onChange({ ...s, [key]: e.target.value })}
              className="size-8 cursor-pointer rounded-control border border-[var(--ds-border)] bg-transparent"
            />
            <DashboardInput
              type="text"
              value={s[key] as string}
              onChange={(e) => onChange({ ...s, [key]: e.target.value })}
              className="w-24 font-mono text-xs"
              spellCheck={false}
            />
          </div>
        </label>
      ))}

      <div className="flex flex-col gap-2">
        <span className={labelClass}>{footerMessages.heightLabel}</span>
        <SegmentSwitch
          value={s.height}
          onChange={(v) => onChange({ ...s, height: v })}
          options={sizeOptions}
        />
      </div>

      <div className="flex flex-col gap-2">
        <span className={labelClass}>{footerMessages.verticalPaddingLabel}</span>
        <SegmentSwitch
          value={s.paddingY}
          onChange={(v) => onChange({ ...s, paddingY: v })}
          options={sizeOptions}
        />
      </div>
    </Card>
  );
}
