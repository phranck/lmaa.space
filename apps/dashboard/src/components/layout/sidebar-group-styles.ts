/**
 * Returns the shared class list for navigation items in collapsible sidebar groups.
 */
export function sidebarGroupItemClass({ isActive }: { isActive: boolean }): string {
  return `flex items-center gap-2 px-3 py-1.5 rounded-control text-sm font-medium ${
    isActive
      ? "bg-[var(--ds-nav-active-bg)] text-[var(--ds-nav-active-text)]"
      : "text-[var(--ds-nav-text)] hover:bg-[var(--ds-nav-hover-bg)] hover:text-[var(--ds-nav-hover-text)]"
  }`;
}
