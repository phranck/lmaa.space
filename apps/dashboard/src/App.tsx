import { Routes, Route, Navigate } from "react-router";
import { AuthProvider, useAuth } from "@/features/auth/AuthContext.tsx";
import { LoginPage } from "@/features/auth/LoginPage.tsx";
import { SetupPage } from "@/features/auth/SetupPage.tsx";
import { AdminLayout } from "@/components/layout/AdminLayout.tsx";
import { DashboardPage } from "@/features/dashboard/DashboardPage.tsx";
import { SubmissionsPage } from "@/features/submissions/SubmissionsPage.tsx";
import { ShopsPage } from "@/features/shops/ShopsPage.tsx";
import { CategoriesPage } from "@/features/categories/CategoriesPage.tsx";
import { UsersPage } from "@/features/users/UsersPage.tsx";

function AppRoutes() {
  const { user, isLoading, needsSetup } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[var(--color-background)] flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-[var(--color-primary)] border-t-transparent animate-spin" />
      </div>
    );
  }

  return (
    <Routes>
      <Route path="/setup" element={<SetupPage />} />
      <Route path="/login" element={user ? <Navigate to="/" replace /> : <LoginPage />} />

      {user ? (
        <Route element={<AdminLayout />}>
          <Route index element={<DashboardPage />} />
          <Route path="vorschlaege" element={<SubmissionsPage />} />
          <Route path="shops" element={<ShopsPage />} />
          <Route path="kategorien" element={<CategoriesPage />} />
          {user.isOwner && <Route path="benutzer" element={<UsersPage />} />}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      ) : (
        <Route path="*" element={<Navigate to={needsSetup ? "/setup" : "/login"} replace />} />
      )}
    </Routes>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  );
}
