import { ListIcon } from "@phosphor-icons/react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Outlet, useNavigate } from "react-router";

import { Sidebar } from "@/components/layout/Sidebar.tsx";
import { FooterUserInfo } from "@/components/layout/SidebarFooter.tsx";
import { Card } from "@/components/ui/Card.tsx";
import { ThemeSegmentedControl } from "@/components/ui/ThemeSegmentedControl.tsx";
import { BodyCardProvider, useBodyCard } from "@/context/BodyCardContext.tsx";
import { useI18n } from "@/context/I18nContext.tsx";
import { PageFooterProvider, usePageFooterContext } from "@/context/PageFooterContext.tsx";
import { PageHeaderProvider, usePageHeaderContext } from "@/context/PageHeaderContext.tsx";
import { useTheme } from "@/context/ThemeContext.tsx";
import { useAuth } from "@/features/auth/AuthContext.tsx";
import { UserEditCard } from "@/features/system/users/UserEditCard.tsx";
import { usePushNotifications } from "@/lib/hooks/usePushNotifications.ts";
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

  const widthRef = useRef(width);
  widthRef.current = width;

  const onMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    isResizing.current = true;
    startX.current = e.clientX;
    startW.current = widthRef.current;
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
  }, []);

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
  const { setActionsEl: setFooterActionsEl } = usePageFooterContext();
  const { chromeless } = useBodyCard();
  const { width: sidebarWidth, onMouseDown: onResizeStart } = useSidebarWidth();
  const hasCustomTitleContent = titleContent !== null;
  const push = usePushNotifications();

  useEffect(() => {
    if (push.state === "unsubscribed" && Notification.permission === "granted") {
      push.subscribe();
    }
  }, [push.state, push.subscribe]);

  async function handleLogout() {
    await logout();
    navigate("/login");
  }

  return (
    <div
      className="dashboard-grid gap-3 p-3 bg-[var(--ds-bg)]"
      style={{ "--sidebar-w": `${sidebarWidth}px` } as React.CSSProperties}
    >
      {/* Header Card */}
      <Card
        className={`col-span-2 md:col-span-2 flex items-center gap-3 py-4 shadow-sm ${import.meta.env.DEV ? "border-2 border-[#9e7938] bg-amber-500/5" : ""}`}
      >
        <div
          className="hidden md:flex items-center justify-center shrink-0 h-full px-3"
          style={{ width: sidebarWidth }}
        >
          <img src="/logo.png" alt="lmaa.space" className="h-8 w-auto dark:invert dark:brightness-90" />
        </div>
        <div className="flex-1 flex items-center justify-between px-3">
          <div className="flex min-w-0 items-center gap-4">
            <button
              type="button"
              onClick={() => setSidebarOpen(true)}
              className="md:hidden p-2 -ml-2 text-[var(--ds-text-muted)] hover:text-[var(--ds-text)]"
              aria-label={messages.layout.menuOpen}
            >
              <ListIcon weight="duotone" className="w-5 h-5" />
            </button>
            <div ref={setLeadingEl} className="flex items-center shrink-0" />
            {hasCustomTitleContent ? (
              <div className="min-w-0 overflow-hidden leading-tight">{titleContent}</div>
            ) : (
              <span className="font-semibold text-sm text-[var(--ds-text)] font-serif truncate">
                {title || messages.layout.pageFallbackTitle}
              </span>
            )}
          </div>
          <div className="flex items-center gap-3 ml-auto">
            <div ref={setActionsEl} className="flex items-center gap-2" />
            <ThemeToggle userId={user?.id} />
          </div>
        </div>
      </Card>

      {/* Sidebar Card */}
      <Card className="hidden md:flex flex-col overflow-y-auto overflow-x-hidden relative shadow-sm">
        <Sidebar
          bare
          username={user?.username}
          firstName={user?.firstName}
          lastName={user?.lastName}
          avatarUrl={user?.avatarUrl}
          role={user?.role}
          onLogout={handleLogout}
          onEditProfile={() => setEditingOwnProfile(true)}
        />
        <button
          type="button"
          onMouseDown={onResizeStart}
          aria-label={messages.layout.resizeSidebar}
          className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-[var(--color-primary)]/40 active:bg-[var(--color-primary)]/60"
        />
      </Card>

      {/* Body Card */}
      {chromeless ? (
        <div className="flex items-center justify-center min-h-0 overflow-auto">
          <Outlet />
        </div>
      ) : (
        <Card className="overflow-auto p-3 flex flex-col min-h-0 shadow-sm">
          <Outlet />
        </Card>
      )}

      {/* Footer Card */}
      <Card className="col-span-2 md:col-span-2 flex items-center gap-3 py-4 shadow-sm">
        <div
          className="hidden md:flex items-center shrink-0 h-full px-3"
          style={{ width: sidebarWidth }}
        >
          <FooterUserInfo
            username={user?.username}
            firstName={user?.firstName}
            lastName={user?.lastName}
            avatarUrl={user?.avatarUrl}
            role={user?.role}
            onLogout={handleLogout}
            onEditProfile={() => setEditingOwnProfile(true)}
          />
        </div>
        <div ref={setFooterActionsEl} className="flex-1 flex items-center justify-end gap-2 px-3" />
      </Card>

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
      <PageFooterProvider>
        <BodyCardProvider>
          <AdminLayoutInner />
        </BodyCardProvider>
      </PageFooterProvider>
    </PageHeaderProvider>
  );
}
