interface HlsAssetVisualProps {
  className?: string;
  compact?: boolean;
}

function cx(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ");
}

export function HlsTypeBadge({ className }: { className?: string }) {
  return (
    <span
      className={cx(
        "inline-flex h-4 min-w-8 items-center justify-center rounded-md border border-white/45 bg-[#3b2bbf] px-1.5 text-[9px] font-black leading-none text-white shadow-sm",
        className,
      )}
    >
      HLS
    </span>
  );
}

export function HlsAssetVisual({ className, compact = false }: HlsAssetVisualProps) {
  return (
    <div
      className={cx(
        "relative flex size-full items-center justify-center overflow-hidden bg-[#070817]",
        className,
      )}
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_15%_18%,rgba(56,189,248,0.38),transparent_30%),radial-gradient(circle_at_85%_25%,rgba(79,70,229,0.55),transparent_34%),radial-gradient(circle_at_70%_85%,rgba(217,70,239,0.5),transparent_38%),linear-gradient(135deg,#060711_0%,#14175d_45%,#4b1168_100%)]" />
      <div className="absolute inset-x-[12%] top-[14%] h-px bg-white/18" />
      <div className="absolute -left-[10%] bottom-[12%] h-[34%] w-[70%] rotate-[-18deg] rounded-full bg-cyan-300/14 blur-2xl" />
      <div className="absolute -right-[12%] top-[20%] h-[45%] w-[62%] rotate-[22deg] rounded-full bg-fuchsia-400/16 blur-2xl" />
      <div
        className={cx(
          "relative z-10 rounded-2xl border-[3px] border-white bg-white/[0.04] font-black leading-none tracking-normal text-white shadow-[0_14px_40px_rgba(0,0,0,0.32)] backdrop-blur-sm",
          compact ? "px-3 py-2 text-sm" : "px-6 py-4 text-3xl",
        )}
      >
        HLS
      </div>
    </div>
  );
}
