import { useI18n } from "@/context/I18nContext.tsx";
import { Checkbox } from "@lmaa/ui";
import { useEffect, useRef, useState } from "react";
import { SiMarkdown } from "react-icons/si";

interface ShopDeleteReasonCardProps {
  shopName: string;
  wasReported?: boolean;
  isPending?: boolean;
  onConfirm: (reason: string, wasReported: boolean) => void;
  onCancel: () => void;
}

export function ShopDeleteReasonCard({
  shopName,
  wasReported: initialWasReported = false,
  isPending = false,
  onConfirm,
  onCancel,
}: ShopDeleteReasonCardProps) {
  const { messages } = useI18n();
  const common = messages.common;
  const shopsMessages = messages.shops;
  const [reason, setReason] = useState("");
  const [wasReported, setWasReported] = useState(initialWasReported);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    textareaRef.current?.focus();
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancel();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onCancel]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-[var(--ds-surface)] rounded-2xl shadow-xl w-full max-w-lg border border-[var(--ds-border)] overflow-hidden overlay-card-enter">
        <div className="px-6 py-5 border-b border-[var(--ds-border)]">
          <h2 className="text-base font-semibold text-[var(--ds-text)]">
            {shopsMessages.deleteCard.title}
          </h2>
          <p className="text-sm text-[var(--ds-text-muted)] mt-0.5">
            <span className="font-medium text-[var(--ds-text)]">{shopName}</span>{" "}
            {shopsMessages.deleteCard.markedDeletedHint}
          </p>
        </div>

        <div className="px-6 py-5 space-y-4">
          <div>
            <label
              htmlFor="shop-delete-reason"
              className="block text-xs font-medium text-[var(--ds-text-muted)] mb-1"
            >
              <span className="flex items-center gap-1.5">
                {shopsMessages.deleteCard.reason}{" "}
                <span className="text-[var(--ds-text-subtle)] font-normal">
                  {shopsMessages.deleteCard.optional}
                </span>
                <SiMarkdown
                  className="w-5 h-5 opacity-40"
                  title={shopsMessages.deleteCard.markdownSupported}
                />
              </span>
            </label>
            <textarea
              id="shop-delete-reason"
              ref={textareaRef}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={5}
              placeholder={shopsMessages.deleteCard.reasonPlaceholder}
              className="w-full rounded-control border border-[var(--ds-border)] bg-[var(--ds-input-bg)] text-sm text-[var(--ds-text)] px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] placeholder:text-[var(--ds-text-subtle)]"
            />
          </div>

          <Checkbox
            checked={wasReported}
            onChange={setWasReported}
            label={shopsMessages.deleteCard.reportedLabel}
          />
        </div>

        <div className="px-6 py-4 border-t border-[var(--ds-border)] flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            disabled={isPending}
            className="h-9 px-4 border border-[var(--ds-btn-neutral-border)] rounded-control text-sm text-[var(--ds-btn-neutral-text)] hover:border-[var(--ds-btn-neutral-hover-border)] transition-colors"
          >
            {common.cancel}
          </button>
          <button
            type="button"
            onClick={() => onConfirm(reason.trim(), wasReported)}
            disabled={isPending}
            className="h-9 px-4 bg-red-600 text-white rounded-control text-sm font-medium hover:bg-red-700 transition-colors disabled:opacity-50"
          >
            {isPending ? shopsMessages.deleteCard.deleting : shopsMessages.deleteCard.deleteShop}
          </button>
        </div>
      </div>
    </div>
  );
}
