import { Sidebar } from "@/components/layout/Sidebar.tsx";
import { SegmentedControl } from "@/components/ui/SegmentedControl.tsx";
import { PageHeaderProvider, usePageHeaderContext } from "@/context/PageHeaderContext.tsx";
import { useTheme } from "@/context/ThemeContext.tsx";
import { useAuth } from "@/features/auth/AuthContext.tsx";
import { useCallback, useEffect, useRef, useState } from "react";
import { Outlet, useNavigate } from "react-router";
import {
  SFDesktopcomputer,
  SFLine3Horizontal,
  SFMoonFill,
  SFSunMaxFill,
} from "sf-symbols-lib/monochrome";

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

const THEME_OPTIONS = [
  { value: "light" as const, icon: <SFSunMaxFill className="w-3.5 h-3.5" /> },
  { value: "dark" as const, icon: <SFMoonFill className="w-3.5 h-3.5" /> },
  { value: "system" as const, icon: <SFDesktopcomputer className="w-3.5 h-3.5" /> },
];

function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  return <SegmentedControl value={theme} onChange={setTheme} size="sm" options={THEME_OPTIONS} />;
}

function AdminLayoutInner() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { title, setActionsEl } = usePageHeaderContext();
  const { width: sidebarWidth, onMouseDown: onResizeStart } = useSidebarWidth();

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
          email={user?.email}
          avatarUrl={user?.avatarUrl}
          role={user?.role}
          onLogout={handleLogout}
        />
        {/* Resize handle */}
        <div
          onMouseDown={onResizeStart}
          className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-[var(--color-primary)]/40 active:bg-[var(--color-primary)]/60 transition-colors"
        />
      </aside>

      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-black/30"
            onClick={() => setSidebarOpen(false)}
            aria-label="Menü schließen"
          />
          <aside
            className="relative flex flex-col h-full bg-[var(--ds-surface)] border-r border-[var(--ds-border)]"
            style={{ width: SIDEBAR_DEFAULT }}
          >
            <Sidebar
              username={user?.username}
              email={user?.email}
              avatarUrl={user?.avatarUrl}
              role={user?.role}
              onLogout={handleLogout}
              onItemClick={() => setSidebarOpen(false)}
            />
          </aside>
        </div>
      )}

      {/* Fixed Header — full width on mobile, offset by sidebar on desktop */}
      <header className="sidebar-aware-header h-14 z-30 flex items-center justify-between px-6 bg-[var(--ds-surface)] border-b border-[var(--ds-border)]">
        <button
          type="button"
          onClick={() => setSidebarOpen(true)}
          className="md:hidden p-2 -ml-2 text-[var(--ds-text-muted)] hover:text-[var(--ds-text)] transition-colors"
          aria-label="Menü öffnen"
        >
          <SFLine3Horizontal className="w-5 h-5" />
        </button>

        <span className="font-semibold text-sm text-[var(--ds-text)] truncate">
          {title || "lmaa.space"}
        </span>

        <div className="flex items-center gap-3 ml-auto">
          <div ref={setActionsEl} className="flex items-center gap-2" />
          <ThemeToggle />
        </div>
      </header>

      {/* Main — full width on mobile, offset by sidebar on desktop */}
      <div className="sidebar-aware-main flex flex-col min-h-screen">
        <main className="flex-1 p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

export function AdminLayout() {
  return (
    <PageHeaderProvider>
      <AdminLayoutInner />
    </PageHeaderProvider>
  );
}
