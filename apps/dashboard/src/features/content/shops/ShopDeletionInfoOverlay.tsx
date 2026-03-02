import { Card } from "@/components/ui/Card.tsx";
import { useI18n } from "@/context/I18nContext.tsx";
import type { ShopSummary } from "@lmaa/shared";
import { Marked } from "marked";
import { useEffect, useMemo, useState } from "react";
import { SiMarkdown } from "react-icons/si";
import { SFSquareAndPencilCircleFill, SFTrashFill } from "sf-symbols-lib/monochrome";

/**
 * Local marked instance for rendering deletion reasons.
 *
 * `gfm: false` disables GFM bare-URL autolinks, which in marked v17 run
 * before the inline-link tokenizer and would consume the URL inside
 * `[text](url)` — breaking the link token entirely.
 *
 * Bare-URL autolinks are added back via a custom `url` extension whose
 * `start()` function returns a non-zero offset whenever `https?://` is
 * preceded by other text, so the built-in link tokenizer always gets first
 * crack at `[text](url)` patterns.
 */
const md = new Marked({
  breaks: true,
  gfm: false,
  extensions: [
    {
      name: "url",
      level: "inline" as const,
      start: (src: string) => src.search(/https?:\/\//),
      tokenizer(src: string) {
        const match = /^https?:\/\/[^\s<>"')\]]+/.exec(src);
        if (match) return { type: "url" as const, raw: match[0], href: match[0] };
      },
      renderer: (token: Record<string, string>) =>
        `<a href="${token.href}" target="_blank" rel="noopener noreferrer">${token.href}</a>`,
    },
  ],
  renderer: {
    link({ href, text }: { href: string | null; text: string }) {
      return `<a href="${href ?? ""}" target="_blank" rel="noopener noreferrer">${text}</a>`;
    },
  },
});

interface ShopDeletionInfoOverlayProps {
  shop: ShopSummary;
  onClose: () => void;
  onUpdateReason?: (reason: string | null) => Promise<void>;
}

/**
 * Overlay card showing deletion details (reason, deleted-by, reported flag) for a shop.
 * Supports inline editing of the deletion reason via a Markdown editor.
 *
 * @param props - The deleted shop, a close handler, and an optional reason-update callback.
 * @returns Backdrop + info card overlay.
 */
export function ShopDeletionInfoOverlay({
  shop,
  onClose,
  onUpdateReason,
}: ShopDeletionInfoOverlayProps) {
  const { locale, messages } = useI18n();
  const t = messages.shops.table;

  const [isEditing, setIsEditing] = useState(false);
  const [displayReason, setDisplayReason] = useState(shop.deleteReason ?? null);
  const [editedReason, setEditedReason] = useState(shop.deleteReason ?? "");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        if (isEditing) {
          setIsEditing(false);
          setEditedReason(displayReason ?? "");
        } else {
          onClose();
        }
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose, isEditing, displayReason]);

  async function handleSave() {
    if (!onUpdateReason) return;
    setIsSaving(true);
    try {
      const newReason = editedReason.trim() || null;
      await onUpdateReason(newReason);
      setDisplayReason(newReason);
      setIsEditing(false);
    } finally {
      setIsSaving(false);
    }
  }

  function handleCancelEdit() {
    setEditedReason(displayReason ?? "");
    setIsEditing(false);
  }

  const deletedByName =
    [shop.deletedByFirstName, shop.deletedByLastName].filter(Boolean).join(" ") ||
    shop.deletedByUsername ||
    null;

  const deletedAtFormatted = shop.deletedAt
    ? new Date(shop.deletedAt).toLocaleString(locale, {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : null;

  const reasonHtml = useMemo(
    () => (displayReason ? md.parse(displayReason, { async: false }) : null),
    [displayReason],
  );

  return (
    <>
      <button
        type="button"
        aria-label={messages.common.close}
        className="fixed inset-0 z-40 bg-black/50 overlay-backdrop-enter"
        onClick={onClose}
      />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
        <Card className="pointer-events-auto w-full max-w-2xl shadow-2xl overlay-card-enter">
          <div className="p-5 space-y-4">
            <h2 className="text-sm font-semibold text-[var(--ds-text)]">{t.deletionInfo}</h2>

            <p className="text-sm font-medium text-[var(--ds-text)]">{shop.name}</p>

            <dl className="space-y-2 text-sm">
              {deletedByName && (
                <div className="flex justify-between gap-4">
                  <dt className="text-[var(--ds-text-muted)] shrink-0">{t.deletedBy}</dt>
                  <dd className="text-[var(--ds-text)] text-right">{deletedByName}</dd>
                </div>
              )}
              {deletedAtFormatted && (
                <div className="flex justify-between gap-4">
                  <dt className="text-[var(--ds-text-muted)] shrink-0">{t.deletedAt}</dt>
                  <dd className="text-[var(--ds-text)] text-right text-xs tabular-nums">
                    {deletedAtFormatted}
                  </dd>
                </div>
              )}
              <div className="flex flex-col gap-1">
                <dt className="text-[var(--ds-text-muted)]">{t.deletionReason}</dt>
                <dd className="text-xs leading-relaxed">
                  {isEditing ? (
                    <div className="relative">
                      <textarea
                        value={editedReason}
                        onChange={(e) => setEditedReason(e.target.value)}
                        rows={6}
                        className="w-full px-3 py-2 border border-[var(--ds-border)] rounded-control text-sm bg-[var(--ds-input-bg)] text-[var(--ds-text)] placeholder:text-[var(--ds-text-subtle)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] resize-none"
                      />
                      <SiMarkdown className="absolute bottom-2 right-2 w-6 h-6 text-[var(--ds-text-subtle)] opacity-40 pointer-events-none" />
                    </div>
                  ) : reasonHtml ? (
                    <div
                      className="prose prose-sm max-w-none text-[var(--ds-text)] prose-a:text-[var(--color-primary)] prose-a:break-all"
                      // biome-ignore lint/security/noDangerouslySetInnerHtml: marked output from trusted admin-entered content
                      dangerouslySetInnerHTML={{ __html: reasonHtml }}
                    />
                  ) : (
                    <span className="text-[var(--ds-text-subtle)] italic">{t.noReason}</span>
                  )}
                </dd>
              </div>
            </dl>
          </div>

          {/* Footer */}
          <div className="px-5 py-3 border-t border-[var(--ds-border)] flex items-center justify-between gap-4">
            {shop.deletedWasReported ? (
              <span className="flex items-center gap-1.5 text-xs text-red-400">
                <SFTrashFill className="w-3 h-3 shrink-0" />
                {t.wasReported}
              </span>
            ) : (
              <span />
            )}

            <div className="flex items-center gap-2">
              {isEditing ? (
                <>
                  <button
                    type="button"
                    onClick={handleCancelEdit}
                    disabled={isSaving}
                    className="h-9 px-4 border border-[var(--ds-btn-neutral-border)] text-[var(--ds-btn-neutral-text)] rounded-control text-sm font-medium hover:border-[var(--ds-btn-neutral-hover-border)] transition-colors disabled:opacity-50"
                  >
                    {messages.common.cancel}
                  </button>
                  <button
                    type="button"
                    onClick={handleSave}
                    disabled={isSaving}
                    className="h-9 px-4 bg-[var(--ds-btn-primary-bg)] text-[var(--ds-btn-primary-fg)] rounded-control text-sm font-medium hover:bg-[var(--ds-btn-primary-hover)] transition-colors disabled:opacity-50"
                  >
                    {isSaving ? messages.common.saving : messages.common.save}
                  </button>
                </>
              ) : (
                <>
                  {onUpdateReason && (
                    <button
                      type="button"
                      onClick={() => setIsEditing(true)}
                      className="h-9 px-4 flex items-center gap-2 border border-[var(--ds-btn-neutral-border)] text-[var(--ds-btn-neutral-text)] rounded-control text-sm font-medium hover:border-[var(--ds-btn-neutral-hover-border)] transition-colors"
                    >
                      <SFSquareAndPencilCircleFill className="w-3.5 h-3.5" />
                      {messages.common.edit}
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={onClose}
                    className="h-9 px-4 bg-[var(--ds-btn-primary-bg)] text-[var(--ds-btn-primary-fg)] rounded-control text-sm font-medium hover:bg-[var(--ds-btn-primary-hover)] transition-colors"
                  >
                    {messages.common.ok}
                  </button>
                </>
              )}
            </div>
          </div>
        </Card>
      </div>
    </>
  );
}
