import { useState } from "react";
import { Outlet, useNavigate } from "react-router";
import { LuMenu } from "react-icons/lu";
import { useAuth } from "@/features/auth/AuthContext.tsx";
import { PageHeaderProvider, usePageHeaderContext } from "@/context/PageHeaderContext.tsx";
import { Sidebar } from "@/components/layout/Sidebar.tsx";

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
          <LuMenu size={20} />
        </button>

        <span className="font-semibold text-sm text-[var(--ds-text)] truncate">
          {title || "dein.shop"}
        </span>

        <div ref={setActionsEl} className="flex items-center gap-2" />
      </header>

      {/* Main */}
      <div className="md:ml-56 pt-14 flex flex-col min-h-screen">
        <main className="flex-1 p-6 max-w-5xl w-full mx-auto">
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
