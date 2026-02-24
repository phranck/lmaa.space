import { lazy, Suspense } from "react";
import { AdminLayout } from "@/components/layout/AdminLayout.tsx";
import { ContentEditorLoadingFallback } from "@/components/ContentEditorLoadingFallback.tsx";
import { ThemeProvider } from "@/context/ThemeContext.tsx";
import { AuthProvider, useAuth } from "@/features/auth/AuthContext.tsx";
import { LoginPage } from "@/features/auth/LoginPage.tsx";
import { SetupPage } from "@/features/auth/SetupPage.tsx";
import { CategoriesPage } from "@/features/categories/CategoriesPage.tsx";
import { DashboardPage } from "@/features/dashboard/DashboardPage.tsx";
import { ShopsPage } from "@/features/shops/ShopsPage.tsx";
import { SubmissionsPage } from "@/features/submissions/SubmissionsPage.tsx";
import { UsersPage } from "@/features/users/UsersPage.tsx";
import { Navigate, Route, Routes } from "react-router";

const ContentEditorPage = lazy(() =>
  import("@/features/content/ContentEditorPage.tsx").then((m) => ({
    default: m.ContentEditorPage,
  })),
);

const PagesListPage = lazy(() =>
  import("@/features/content/PagesListPage.tsx").then((m) => ({
    default: m.PagesListPage,
  })),
);

const NavManagerPage = lazy(() =>
  import("@/features/content/NavManagerPage.tsx").then((m) => ({
    default: m.NavManagerPage,
  })),
);

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
          <Route path="meldungen" element={<SubmissionsPage />} />
          <Route path="shops" element={<ShopsPage />} />
          <Route path="kategorien" element={<CategoriesPage />} />
          {user.isOwner && <Route path="benutzer" element={<UsersPage />} />}
          {user.role !== "moderator" && (
            <>
              <Route
                path="seiten"
                element={
                  <Suspense fallback={<ContentEditorLoadingFallback />}>
                    <PagesListPage />
                  </Suspense>
                }
              />
              <Route
                path="seiten/navigationen"
                element={
                  <Suspense fallback={<ContentEditorLoadingFallback />}>
                    <NavManagerPage />
                  </Suspense>
                }
              />
              <Route
                path="seiten/:slug"
                element={
                  <Suspense fallback={<ContentEditorLoadingFallback />}>
                    <ContentEditorPage />
                  </Suspense>
                }
              />
            </>
          )}
          {/* backward compat redirect */}
          <Route path="content/:slug" element={<Navigate to="/" replace />} />
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
    <ThemeProvider>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </ThemeProvider>
  );
}
