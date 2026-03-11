import { ListIcon } from "@phosphor-icons/react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Outlet, useNavigate } from "react-router";

import { Sidebar } from "@/components/layout/Sidebar.tsx";
import { ThemeSegmentedControl } from "@/components/ui/ThemeSegmentedControl.tsx";
import { useI18n } from "@/context/I18nContext.tsx";
import { PageHeaderProvider, usePageHeaderContext } from "@/context/PageHeaderContext.tsx";
import { useTheme } from "@/context/ThemeContext.tsx";
import { useAuth } from "@/features/auth/AuthContext.tsx";
import { UserEditCard } from "@/features/system/UserEditCard.tsx";
import { getSegmentedStorageKey } from "@/lib/segmented-storage.ts";

const SIDEBAR_DEFAULT = 224;
const SIDEBAR_MIN = 160;
const SIDEBAR_MAX = 420;

function useSidebarWidth() {
  const [width, setWidth] = useState(() => {
    try {
      const v = localStorage.getItem("sidebar-width");
      if (v) return Math.max(SIDEBAR_MIN, Math.min(SIDEBAR_MAX, Number(v)));
    } catch {}
    return SIDEBAR_DEFAULT;
  });

  const isResizing = useRef(false);
  const startX = useRef(0);
  const startW = useRef(0);

  const onMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      isResizing.current = true;
      startX.current = e.clientX;
      startW.current = width;
      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";
    },
    [width],
  );

  useEffect(() => {
    function onMove(e: MouseEvent) {
      if (!isResizing.current) return;
      const w = Math.max(
        SIDEBAR_MIN,
        Math.min(SIDEBAR_MAX, startW.current + e.clientX - startX.current),
      );
      setWidth(w);
    }
    function onUp() {
      if (!isResizing.current) return;
      isResizing.current = false;
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
      setWidth((w) => {
        try {
          localStorage.setItem("sidebar-width", String(w));
        } catch {}
        return w;
      });
    }
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
    return () => {
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
    };
  }, []);

  return { width, onMouseDown };
}

function ThemeToggle({ userId }: { userId?: number }) {
  const { theme, setTheme } = useTheme();
  return (
    <ThemeSegmentedControl
      value={theme}
      onChange={setTheme}
      storageKey={getSegmentedStorageKey(userId, "layout:theme")}
    />
  );
}

function AdminLayoutInner() {
  const { user, logout } = useAuth();
  const { messages } = useI18n();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [editingOwnProfile, setEditingOwnProfile] = useState(false);
  const { title, titleContent, setLeadingEl, setActionsEl } = usePageHeaderContext();
  const { width: sidebarWidth, onMouseDown: onResizeStart } = useSidebarWidth();
  const hasCustomTitleContent = titleContent !== null;

  async function handleLogout() {
    await logout();
    navigate("/login");
  }

  return (
    <div
      className="min-h-screen bg-[var(--ds-bg)]"
      style={{ "--sidebar-w": `${sidebarWidth}px` } as React.CSSProperties}
    >
      {/* Desktop Sidebar – fixed, resizable */}
      <aside
        className="hidden md:flex fixed inset-y-0 left-0 flex-col bg-[var(--ds-surface)] border-r border-[var(--ds-border)] z-40"
        style={{ width: sidebarWidth }}
      >
        <Sidebar
          username={user?.username}
          firstName={user?.firstName}
          lastName={user?.lastName}
          avatarUrl={user?.avatarUrl}
          role={user?.role}
          onLogout={handleLogout}
          onEditProfile={() => setEditingOwnProfile(true)}
        />
        {/* Resize handle */}
        <button
          type="button"
          onMouseDown={onResizeStart}
          aria-label={messages.layout.resizeSidebar}
          className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-[var(--color-primary)]/40 active:bg-[var(--color-primary)]/60"
        />
      </aside>

      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <button
            type="button"
            className="absolute inset-0 backdrop-blur-md"
            onClick={() => setSidebarOpen(false)}
            aria-label={messages.layout.menuClose}
          />
          <aside
            className="relative flex flex-col h-full bg-[var(--ds-surface)] border-r border-[var(--ds-border)]"
            style={{ width: SIDEBAR_DEFAULT }}
          >
            <Sidebar
              username={user?.username}
              firstName={user?.firstName}
              lastName={user?.lastName}
              avatarUrl={user?.avatarUrl}
              role={user?.role}
              onLogout={handleLogout}
              onItemClick={() => setSidebarOpen(false)}
              onEditProfile={() => setEditingOwnProfile(true)}
            />
          </aside>
        </div>
      )}

      {/* Fixed Header — full width on mobile, offset by sidebar on desktop */}
      <header
        className="sidebar-aware-header z-30 flex h-14 items-center justify-between px-6 bg-[var(--ds-surface)] border-b border-[var(--ds-border)]"
      >
        <div className="flex min-w-0 items-center gap-4">
          <button
            type="button"
            onClick={() => setSidebarOpen(true)}
            className="md:hidden p-2 -ml-2 text-[var(--ds-text-muted)] hover:text-[var(--ds-text)] transition-colors"
            aria-label={messages.layout.menuOpen}
          >
            <ListIcon weight="duotone" className="w-5 h-5" />
          </button>

          <div ref={setLeadingEl} className="flex items-center shrink-0" />

          {hasCustomTitleContent ? (
            <div className="min-w-0 overflow-hidden leading-tight">{titleContent}</div>
          ) : (
            <span className="font-semibold text-sm text-[var(--ds-text)] truncate">
              {title || messages.layout.pageFallbackTitle}
            </span>
          )}
        </div>

        <div className="flex items-center gap-3 ml-auto">
          <div ref={setActionsEl} className="flex items-center gap-2" />
          <ThemeToggle userId={user?.id} />
        </div>
      </header>

      {/* Main — full width on mobile, offset by sidebar on desktop */}
      <div className="sidebar-aware-main flex flex-col min-h-screen">
        <main className="flex-1 p-3 flex flex-col">
          <Outlet />
        </main>
      </div>

      {editingOwnProfile && user && (
        <UserEditCard
          userId={user.id}
          onClose={() => setEditingOwnProfile(false)}
          onSaved={() => setEditingOwnProfile(false)}
        />
      )}
    </div>
  );
}

/**
 * Main authenticated dashboard layout with sidebar and routed content.
 *
 * @returns Two-pane admin UI scaffold.
 */
export function AdminLayout() {
  return (
    <PageHeaderProvider>
      <AdminLayoutInner />
    </PageHeaderProvider>
  );
}
