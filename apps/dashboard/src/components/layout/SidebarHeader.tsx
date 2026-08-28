/**
 * Static branding header at the top of the sidebar.
 *
 * @returns Logo/title block.
 */
export function SidebarHeader() {
  return (
    <div className="h-14 flex items-center justify-center border-b border-[var(--ds-border)] shrink-0">
      <img src="/logo.png" alt="lmaa.space" className="h-8 w-auto invert brightness-90" />
    </div>
  );
}
