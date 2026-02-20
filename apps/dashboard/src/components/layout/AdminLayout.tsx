import { useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router";
import { useAuth } from "../../features/auth/AuthContext.tsx";

interface NavItem {
  to: string;
  label: string;
  icon: string;
  ownerOnly?: boolean;
}

const NAV_ITEMS: NavItem[] = [
  { to: "/", label: "Übersicht", icon: "⊞" },
  { to: "/vorschlaege", label: "Vorschläge", icon: "📬" },
  { to: "/shops", label: "Shops", icon: "🛍️" },
  { to: "/kategorien", label: "Kategorien", icon: "🗂️" },
  { to: "/benutzer", label: "Benutzer", icon: "👥", ownerOnly: true },
];

export function AdminLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  async function handleLogout() {
    await logout();
    navigate("/login");
  }

  const navItems = NAV_ITEMS.filter((item) => !item.ownerOnly || user?.isOwner);

  const Sidebar = () => (
    <nav className="flex flex-col h-full">
      <div className="px-6 py-5 border-b border-gray-100">
        <p className="font-bold text-[var(--color-primary)] text-lg">dein.shop</p>
        <p className="text-xs text-gray-400 mt-0.5">Admin</p>
      </div>

      <ul className="flex-1 py-4 px-3 space-y-1">
        {navItems.map((item) => (
          <li key={item.to}>
            <NavLink
              to={item.to}
              end={item.to === "/"}
              onClick={() => setSidebarOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-[var(--color-primary)] text-white"
                    : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                }`
              }
            >
              <span className="text-base">{item.icon}</span>
              {item.label}
            </NavLink>
          </li>
        ))}
      </ul>

      <div className="px-3 py-4 border-t border-gray-100">
        <div className="px-3 py-2 mb-2">
          <p className="text-xs font-medium text-gray-700 truncate">{user?.username}</p>
          <p className="text-xs text-gray-400 truncate">{user?.email}</p>
        </div>
        <button
          type="button"
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-gray-500 hover:bg-red-50 hover:text-red-600 transition-colors"
        >
          <span>→</span>
          Abmelden
        </button>
      </div>
    </nav>
  );

  return (
    <div className="min-h-screen flex bg-[var(--color-background)]">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex w-56 bg-white border-r border-gray-100 flex-col shrink-0">
        <Sidebar />
      </aside>

      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-black/30"
            onClick={() => setSidebarOpen(false)}
            aria-label="Menü schließen"
          />
          <aside className="relative w-56 h-full bg-white border-r border-gray-100 flex flex-col">
            <Sidebar />
          </aside>
        </div>
      )}

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile Header */}
        <header className="md:hidden flex items-center gap-3 px-4 h-14 bg-white border-b border-gray-100">
          <button
            type="button"
            onClick={() => setSidebarOpen(true)}
            className="p-2 text-gray-500"
            aria-label="Menü öffnen"
          >
            ☰
          </button>
          <span className="font-bold text-[var(--color-primary)]">dein.shop Admin</span>
        </header>

        <main className="flex-1 p-6 max-w-5xl w-full mx-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
