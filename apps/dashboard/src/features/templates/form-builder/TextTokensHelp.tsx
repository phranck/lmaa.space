import { QuestionIcon } from "@phosphor-icons/react";

import { CloseActionButton } from "@/components/ui/DashboardActionButton.tsx";
import { dialogHeaderIconClass } from "@/components/ui/Dialog.tsx";
import { OverlayCard } from "@/components/ui/OverlayCard.tsx";
import { useI18n } from "@/context/I18nContext.tsx";

interface TextTokensHelpProps {
  open: boolean;
  onClose: () => void;
}

const TOKEN_ROWS = [
  { token: "nbhy", symbol: "‑", codepoint: "U+2011" },
  { token: "nbsp", symbol: " ", codepoint: "U+00A0" },
  { token: "wj", symbol: "⁠", codepoint: "U+2060" },
  { token: "shy", symbol: "­", codepoint: "U+00AD" },
  { token: "ndash", symbol: "–", codepoint: "U+2013" },
  { token: "mdash", symbol: "—", codepoint: "U+2014" },
  { token: "zwj", symbol: "‍", codepoint: "U+200D" },
  { token: "zwnj", symbol: "‌", codepoint: "U+200C" },
] as const;

export function TextTokensHelp({ open, onClose }: TextTokensHelpProps) {
  const { messages } = useI18n();
  const t = messages.formBuilder.textTokensHelp;

  return (
    <OverlayCard
      open={open}
      onClose={onClose}
      size={{ storageKey: "form-builder:text-tokens-help-size", defaultWidth: 720 }}
      aria-label={t.title}
      backdropClose
    >
      <OverlayCard.Header>
        <div className="flex items-center gap-3">
          <QuestionIcon weight="duotone" className={dialogHeaderIconClass} />
          <h3 className="font-semibold text-[var(--ds-text)]">{t.title}</h3>
        </div>
      </OverlayCard.Header>

      <OverlayCard.Body className="space-y-6">
        <p className="text-sm text-[var(--ds-text-muted)] leading-relaxed">{t.description}</p>

        <section className="space-y-3">
          <h4 className="text-sm font-semibold text-[var(--ds-text)]">{t.notations.title}</h4>
          <dl className="space-y-3 text-sm">
            <div>
              <dt className="font-medium text-[var(--ds-text)]">{t.notations.unicodeTitle}</dt>
              <dd className="text-[var(--ds-text-muted)] mt-0.5">{t.notations.unicodeBody}</dd>
            </div>
            <div>
              <dt className="font-medium text-[var(--ds-text)]">{t.notations.namedTitle}</dt>
              <dd className="text-[var(--ds-text-muted)] mt-0.5">{t.notations.namedBody}</dd>
            </div>
            <div>
              <dt className="font-medium text-[var(--ds-text)]">{t.notations.entityTitle}</dt>
              <dd className="text-[var(--ds-text-muted)] mt-0.5">{t.notations.entityBody}</dd>
            </div>
          </dl>
          <p className="text-xs text-[var(--ds-text-muted)] italic border-l-2 border-[var(--ds-border)] pl-3">
            {t.notations.edgeCaseNote}
          </p>
        </section>

        <section className="space-y-3">
          <h4 className="text-sm font-semibold text-[var(--ds-text)]">{t.tableTitle}</h4>
          <div className="overflow-hidden rounded-control border border-[var(--ds-border)]">
            <table className="w-full text-sm">
              <thead className="bg-[var(--ds-surface-inset)] text-left">
                <tr>
                  <th className="px-3 py-1 font-medium text-[var(--ds-text-muted)]">
                    {t.cols.token}
                  </th>
                  <th className="px-3 py-1 font-medium text-[var(--ds-text-muted)]">
                    {t.cols.symbol}
                  </th>
                  <th className="px-3 py-1 font-medium text-[var(--ds-text-muted)]">
                    {t.cols.codepoint}
                  </th>
                  <th className="px-3 py-1 font-medium text-[var(--ds-text-muted)]">
                    {t.cols.description}
                  </th>
                </tr>
              </thead>
              <tbody>
                {TOKEN_ROWS.map(({ token, symbol, codepoint }) => (
                  <tr key={token} className="border-t border-[var(--ds-border)]">
                    <td className="px-3 py-1 font-mono text-[var(--ds-text)]">{`{${token}}`}</td>
                    <td className="px-3 py-1 font-mono text-[var(--ds-text)] text-base">
                      <span className="inline-block min-w-4 border-b border-dashed border-[var(--ds-border)]">
                        {symbol}
                      </span>
                    </td>
                    <td className="px-3 py-1 font-mono text-[var(--ds-text-muted)]">{codepoint}</td>
                    <td className="px-3 py-1 text-[var(--ds-text-muted)]">{t.tokens[token]}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="space-y-3">
          <h4 className="text-sm font-semibold text-[var(--ds-text)]">{t.exampleTitle}</h4>
          <div className="space-y-2 rounded-control border border-[var(--ds-border)] bg-[var(--ds-surface-inset)] p-4">
            <div className="text-xs uppercase tracking-wide text-[var(--ds-text-muted)]">
              {t.exampleInputLabel}
            </div>
            <code className="block font-mono text-sm text-[var(--ds-text)]">
              Vorschlagsannahme oder {"{nbhy}"}ablehnung.
            </code>
            <div className="text-xs uppercase tracking-wide text-[var(--ds-text-muted)] pt-2">
              {t.exampleOutputLabel}
            </div>
            <p className="text-sm text-[var(--ds-text)]">Vorschlagsannahme oder ‑ablehnung.</p>
          </div>
          <p className="text-xs text-[var(--ds-text-muted)]">{t.exampleNote}</p>
        </section>
      </OverlayCard.Body>

      <OverlayCard.Footer className="flex justify-end">
        <CloseActionButton iconOnly={false} label={t.close} onClick={onClose} variant="neutral" />
      </OverlayCard.Footer>
    </OverlayCard>
  );
}
