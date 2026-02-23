import { Sidebar } from "@/components/layout/Sidebar.tsx";
import { PageHeaderProvider, usePageHeaderContext } from "@/context/PageHeaderContext.tsx";
import { type Theme, useTheme } from "@/context/ThemeContext.tsx";
import { useAuth } from "@/features/auth/AuthContext.tsx";
import { useState } from "react";
import { Outlet, useNavigate } from "react-router";
import { SFDesktopcomputer, SFLine3Horizontal, SFMoon, SFSunMax } from "sf-symbols-lib/monochrome";

const THEME_OPTIONS: { value: Theme; icon: React.ReactNode; label: string }[] = [
  { value: "light", icon: <SFSunMax className="w-3.5 h-3.5" />, label: "Light" },
  { value: "dark", icon: <SFMoon className="w-3.5 h-3.5" />, label: "Dark" },
  { value: "system", icon: <SFDesktopcomputer className="w-3.5 h-3.5" />, label: "System" },
];

function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  return (
    <div className="flex items-center gap-0.5 rounded-lg bg-[var(--ds-bg-elevated)] p-0.5">
      {THEME_OPTIONS.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => setTheme(opt.value)}
          title={opt.label}
          className={`flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium transition-colors ${
            theme === opt.value
              ? "bg-[var(--ds-surface)] text-[var(--ds-text)] shadow-sm"
              : "text-[var(--ds-text-muted)] hover:text-[var(--ds-text)]"
          }`}
        >
          {opt.icon}
          <span>{opt.label}</span>
        </button>
      ))}
    </div>
  );
}

function AdminLayoutInner() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { title, setActionsEl } = usePageHeaderContext();

  async function handleLogout() {
    await logout();
    navigate("/login");
  }

  return (
    <div className="min-h-screen bg-[var(--ds-bg)]">
      {/* Desktop Sidebar – fixed */}
      <aside className="hidden md:flex fixed inset-y-0 left-0 w-56 flex-col bg-[var(--ds-surface)] border-r border-[var(--ds-border)] z-40">
        <Sidebar
          username={user?.username}
          email={user?.email}
          isOwner={user?.isOwner}
          onLogout={handleLogout}
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
          <aside className="relative flex flex-col w-56 h-full bg-[var(--ds-surface)] border-r border-[var(--ds-border)]">
            <Sidebar
              username={user?.username}
              email={user?.email}
              isOwner={user?.isOwner}
              onLogout={handleLogout}
              onItemClick={() => setSidebarOpen(false)}
            />
          </aside>
        </div>
      )}

      {/* Fixed Header */}
      <header className="fixed top-0 left-0 right-0 md:left-56 h-14 z-30 flex items-center justify-between px-6 bg-[var(--ds-surface)] border-b border-[var(--ds-border)]">
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
          <ThemeToggle />
          <div ref={setActionsEl} className="flex items-center gap-2" />
        </div>
      </header>

      {/* Main */}
      <div className="md:ml-56 pt-14 flex flex-col min-h-screen">
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
