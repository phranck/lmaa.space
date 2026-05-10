import type { ReactNode } from "react";

import { OverlayCard } from "./OverlayCard.tsx";

interface DialogProps {
	open: boolean;
	title: string;
	titleIcon?: ReactNode;
	headerExtra?: ReactNode;
	onClose: () => void;
	children: ReactNode;
	maxWidth?: "sm" | "md" | "lg";
}

interface DialogFooterProps {
	children: ReactNode;
	className?: string;
}

function DialogFooter({ children, className }: DialogFooterProps) {
	return (
		<div
			className={`bg-[var(--ds-surface-inset)] border-t border-[var(--ds-border)] px-6 py-3 ${className ?? "flex justify-end gap-3"}`}
		>
			{children}
		</div>
	);
}

export const dialogHeaderIconClass = "w-6 h-6 shrink-0 text-[var(--ds-text-muted)]";

export function Dialog({
	open,
	title,
	titleIcon,
	headerExtra,
	onClose,
	children,
	maxWidth = "sm",
}: DialogProps) {
	const size = maxWidth === "lg" ? "fixed-lg" : maxWidth === "md" ? "fixed-md" : "fixed-sm";

	return (
		<OverlayCard open={open} onClose={onClose} size={size} aria-label={title}>
			<div className="bg-[var(--ds-surface-inset)] px-6 py-4 flex items-center gap-3">
				{titleIcon}
				<h3 className="font-semibold text-[var(--ds-text)]">{title}</h3>
				{headerExtra && <div className="ml-auto flex items-center gap-2">{headerExtra}</div>}
			</div>
			{children}
		</OverlayCard>
	);
}

Dialog.Footer = DialogFooter;

/** @deprecated Stage 4 migrates dialog footers to shared button primitives. */
export const dialogBtnPrimary =
	"h-[var(--ds-control-h-field-large)] px-4 border border-[var(--ds-accent)] text-[var(--ds-accent)] rounded-control text-sm font-medium hover:bg-[var(--ds-accent-subtle)] transition-colors disabled:opacity-60";

/** @deprecated Stage 4 migrates dialog footers to shared button primitives. */
export const dialogBtnSecondary =
	"h-[var(--ds-control-h-field-large)] px-4 border border-[var(--ds-border)] rounded-control text-sm text-[var(--ds-text-muted)] hover:border-[var(--ds-border-strong)] transition-colors";

/** @deprecated Stage 4 migrates dialog footers to shared button primitives. */
export const dialogBtnDestructive =
	"h-[var(--ds-control-h-field-large)] px-4 border border-[var(--ds-btn-danger-border)] text-[var(--ds-btn-danger-text)] rounded-control text-sm font-medium hover:border-[var(--ds-btn-danger-hover-border)] hover:bg-[var(--ds-btn-danger-hover-bg)] transition-colors disabled:opacity-60";
