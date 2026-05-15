import type { ReactNode } from "react";

interface EditorPageTitleDetailsProps {
  title: string;
  subtitle?: string | null;
  trailing?: ReactNode;
}

export function EditorPageTitleDetails({ title, subtitle, trailing }: EditorPageTitleDetailsProps) {
  return (
    <div className="pointer-events-none flex min-w-0 items-center gap-3 leading-tight">
      <div className="min-w-0 leading-tight">
        <p className="truncate text-lg font-semibold leading-tight text-[var(--ds-text)]">
          {title}
        </p>
        {subtitle ? (
          <p className="truncate text-[13px] leading-tight text-[var(--ds-text-muted)]">
            {subtitle}
          </p>
        ) : null}
      </div>
      {trailing ? <div className="shrink-0">{trailing}</div> : null}
    </div>
  );
}
