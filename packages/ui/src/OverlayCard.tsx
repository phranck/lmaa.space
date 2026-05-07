import {
	type ReactNode,
	useCallback,
	useEffect,
	useId,
	useLayoutEffect,
	useRef,
	useState,
	useSyncExternalStore,
} from "react";

import {
	getOverlayStackSnapshot,
	registerOverlay,
	subscribeOverlayStack,
} from "./overlay-stack.ts";

// ---------------------------------------------------------------------------
// Injected keyframe styles (inserted once per document)
// ---------------------------------------------------------------------------

const STYLE_ID = "lmaa-overlay-keyframes";

const KEYFRAMES_CSS = `
@keyframes lmaa-overlay-in {
  from { opacity: 0; backdrop-filter: blur(0px); }
  to { opacity: 1; backdrop-filter: blur(24px); }
}
@keyframes lmaa-overlay-out {
  from { opacity: 1; backdrop-filter: blur(24px); }
  to { opacity: 0; backdrop-filter: blur(0px); }
}
@keyframes lmaa-card-in {
  from { opacity: 0; transform: scale(0.96) translateY(8px); }
  to { opacity: 1; transform: scale(1) translateY(0); }
}
@keyframes lmaa-card-out {
  from { opacity: 1; transform: scale(1) translateY(0); }
  to { opacity: 0; transform: scale(0.96) translateY(8px); }
}
`;

function ensureStyles() {
	if (typeof document === "undefined") return;
	if (document.getElementById(STYLE_ID)) return;
	const style = document.createElement("style");
	style.id = STYLE_ID;
	style.textContent = KEYFRAMES_CSS;
	document.head.appendChild(style);
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface OverlayCardProps {
	open: boolean;
	onClose: () => void;
	size?: "fixed-sm" | "fixed-md" | "fixed-lg";
	"aria-label": string;
	className?: string;
	style?: React.CSSProperties;
	backdropClose?: boolean;
	zIndex?: number;
	onEscape?: () => boolean;
	children: ReactNode;
}

// ---------------------------------------------------------------------------
// Sub-Components
// ---------------------------------------------------------------------------

function Header({ children, className }: { children: ReactNode; className?: string }) {
	return (
		<div
			className={[
				"px-5 py-4 bg-[var(--ds-surface-inset)] border-b border-[var(--ds-border-subtle)] shrink-0",
				className,
			]
				.filter(Boolean)
				.join(" ")}
		>
			{children}
		</div>
	);
}

function Footer({ children, className }: { children: ReactNode; className?: string }) {
	return (
		<div
			className={[
				"px-5 py-4 bg-[var(--ds-surface-inset)] border-t border-[var(--ds-border-subtle)] shrink-0",
				className,
			]
				.filter(Boolean)
				.join(" ")}
		>
			{children}
		</div>
	);
}

function Body({ children, className }: { children: ReactNode; className?: string }) {
	return (
		<div className={["flex-1 overflow-y-auto p-5", className].filter(Boolean).join(" ")}>
			{children}
		</div>
	);
}

// ---------------------------------------------------------------------------
// Focus trap helper
// ---------------------------------------------------------------------------

const FOCUSABLE = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';

function trapFocus(e: KeyboardEvent, container: HTMLElement | null) {
	if (e.key !== "Tab" || !container) return;
	const focusable = container.querySelectorAll<HTMLElement>(FOCUSABLE);
	if (focusable.length === 0) return;
	const first = focusable[0];
	const last = focusable[focusable.length - 1];
	if (e.shiftKey && document.activeElement === first) {
		e.preventDefault();
		last.focus();
	} else if (!e.shiftKey && document.activeElement === last) {
		e.preventDefault();
		first.focus();
	}
}

// ---------------------------------------------------------------------------
// OverlayCard
// ---------------------------------------------------------------------------

export function OverlayCard({
	open,
	onClose,
	size = "fixed-sm",
	"aria-label": ariaLabel,
	className,
	style,
	backdropClose = false,
	zIndex = 2000,
	onEscape,
	children,
}: OverlayCardProps) {
	const overlayId = useId();
	const dialogRef = useRef<HTMLDivElement>(null);
	const previousFocusRef = useRef<HTMLElement | null>(null);
	const closingRef = useRef(false);
	const [closing, setClosing] = useState(false);
	const overlayIds = useSyncExternalStore(
		subscribeOverlayStack,
		getOverlayStackSnapshot,
		getOverlayStackSnapshot,
	);
	const stackIndex = overlayIds.indexOf(overlayId);
	const isRegistered = stackIndex !== -1;
	const isTopMost = isRegistered && stackIndex === overlayIds.length - 1;
	const isBaseLayer = isRegistered && stackIndex === 0;

	const startClose = useCallback(() => {
		closingRef.current = true;
		setClosing((current) => (current ? current : true));
	}, []);

	useEffect(() => {
		ensureStyles();
	}, []);

	useEffect(() => {
		if (!open) {
			closingRef.current = false;
			setClosing(false);
		}
	}, [open]);

	useLayoutEffect(() => {
		if (!open) return;
		const handler = () => {
			if (closingRef.current) return;
			if (onEscape) {
				if (onEscape() === false) return;
			}
			startClose();
		};
		return registerOverlay(overlayId, handler);
	}, [open, onEscape, overlayId, startClose]);

	useEffect(() => {
		if (!open) return;
		previousFocusRef.current = document.activeElement as HTMLElement | null;
		return () => {
			previousFocusRef.current?.focus();
		};
	}, [open]);

	useEffect(() => {
		if (!open || !isTopMost) return;
		const dialog = dialogRef.current;
		if (!dialog) return;
		const first = dialog.querySelector<HTMLElement>(FOCUSABLE);
		first?.focus();
	}, [open, isTopMost]);

	useEffect(() => {
		if (!open || !isTopMost) return;
		const handler = (e: KeyboardEvent) => trapFocus(e, dialogRef.current);
		window.addEventListener("keydown", handler);
		return () => window.removeEventListener("keydown", handler);
	}, [open, isTopMost]);

	if (!open) return null;

	const handleBackdropAnimationEnd = (e: React.AnimationEvent) => {
		if (closing && e.target === e.currentTarget) {
			closingRef.current = false;
			setClosing(false);
			onClose();
		}
	};

	const handleBackdropClick = isTopMost && backdropClose && !closing ? startClose : undefined;

	const fixedMaxWidth =
		size === "fixed-lg" ? "max-w-lg" : size === "fixed-md" ? "max-w-md" : "max-w-sm";
	const cardAnim = closing ? "lmaa-card-out 280ms ease forwards" : "lmaa-card-in 380ms ease forwards";
	const backdropAnim = closing ? "lmaa-overlay-out 280ms ease forwards" : "lmaa-overlay-in 360ms ease forwards";
	const effectiveZIndex = isRegistered ? zIndex + stackIndex * 100 : zIndex;

	return (
		<div
			className="fixed inset-0 flex items-center justify-center px-4"
			style={{ zIndex: effectiveZIndex }}
		>
			{/* biome-ignore lint/a11y/useKeyWithClickEvents: backdrop click handled separately, ESC via overlay-stack */}
			<div
				className={[
					"absolute inset-0",
					isBaseLayer ? "backdrop-blur-xl bg-black/10" : "bg-black/20",
					isTopMost ? "pointer-events-auto" : "pointer-events-none",
				]
					.filter(Boolean)
					.join(" ")}
				style={{ animation: backdropAnim }}
				aria-hidden="true"
				onClick={handleBackdropClick}
				onAnimationEnd={handleBackdropAnimationEnd}
			/>
			<div
				ref={dialogRef}
				className={[
					`relative bg-[var(--ds-surface)] border border-[rgba(255,255,255,0.06)] rounded-2xl shadow-xl overflow-hidden w-full ${fixedMaxWidth}`,
					className,
				]
					.filter(Boolean)
					.join(" ")}
				style={{ animation: cardAnim, ...style }}
				role="dialog"
				aria-modal={true}
				aria-label={ariaLabel}
			>
				{children}
			</div>
		</div>
	);
}

OverlayCard.Header = Header;
OverlayCard.Footer = Footer;
OverlayCard.Body = Body;
