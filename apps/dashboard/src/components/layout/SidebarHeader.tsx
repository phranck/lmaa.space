import { LmaaIcon } from "@/components/ui/LmaaIcon.tsx";

/**
 * Static branding header at the top of the sidebar.
 *
 * @returns Logo/title block.
 */
export function SidebarHeader() {
  return (
    <div className="h-14 flex items-center justify-center border-b border-[var(--ds-border)] shrink-0">
      <LmaaIcon label="lmaa.space" className="size-8" />
    </div>
  );
}
