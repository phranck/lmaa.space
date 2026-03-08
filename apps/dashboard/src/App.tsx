import { Suspense, lazy } from "react";
import { Navigate, Route, Routes } from "react-router";

import { ContentEditorLoadingFallback } from "@/components/ContentEditorLoadingFallback.tsx";
import { AdminLayout } from "@/components/layout/AdminLayout.tsx";
import { I18nProvider } from "@/context/I18nContext.tsx";
import { ThemeProvider } from "@/context/ThemeContext.tsx";
import { AuthProvider, useAuth } from "@/features/auth/AuthContext.tsx";
import { InvitePage } from "@/features/auth/InvitePage.tsx";
import { LoginPage } from "@/features/auth/LoginPage.tsx";
import { SetupPage } from "@/features/auth/SetupPage.tsx";

const CategoriesPage = lazy(() =>
  import("@/features/content/categories/CategoriesPage.tsx").then((m) => ({
    default: m.CategoriesPage,
  })),
);

const ShopsPage = lazy(() =>
  import("@/features/content/shops/ShopsPage.tsx").then((m) => ({
    default: m.ShopsPage,
  })),
);

const DashboardPage = lazy(() =>
  import("@/features/overview/DashboardPage.tsx").then((m) => ({
    default: m.DashboardPage,
  })),
);

const SubmissionsPage = lazy(() =>
  import("@/features/overview/SubmissionsPage.tsx").then((m) => ({
    default: m.SubmissionsPage,
  })),
);

const UsersPage = lazy(() =>
  import("@/features/system/UsersPage.tsx").then((m) => ({
    default: m.UsersPage,
  })),
);

const MediaPage = lazy(() =>
  import("@/features/system/media/MediaPage.tsx").then((m) => ({
    default: m.MediaPage,
  })),
);

const ContentEditorPage = lazy(() =>
  import("@/features/content/pages/ContentEditorPage.tsx").then((m) => ({
    default: m.ContentEditorPage,
  })),
);

const PagesListPage = lazy(() =>
  import("@/features/content/pages/PagesListPage.tsx").then((m) => ({
    default: m.PagesListPage,
  })),
);

const NavManagerPage = lazy(() =>
  import("@/features/system/NavManagerPage.tsx").then((m) => ({
    default: m.NavManagerPage,
  })),
);

const AnalyticsPage = lazy(() =>
  import("@/features/analytics/AnalyticsPage.tsx").then((m) => ({
    default: m.AnalyticsPage,
  })),
);

const FormBuilderListPage = lazy(() =>
  import("@/features/templates/form-builder/FormBuilderListPage.tsx").then((m) => ({
    default: m.FormBuilderListPage,
  })),
);

const FormBuilderEditPage = lazy(() =>
  import("@/features/templates/form-builder/FormBuilderEditPage.tsx").then((m) => ({
    default: m.FormBuilderEditPage,
  })),
);

const EmailTemplateListPage = lazy(() =>
  import("@/features/templates/email-templates/EmailTemplateListPage.tsx").then((m) => ({
    default: m.EmailTemplateListPage,
  })),
);

const EmailTemplateEditPage = lazy(() =>
  import("@/features/templates/email-templates/EmailTemplateEditPage.tsx").then((m) => ({
    default: m.EmailTemplateEditPage,
  })),
);

const FooterBuilderPage = lazy(() =>
  import("@/features/content/FooterBuilderPage.tsx").then((m) => ({
    default: m.FooterBuilderPage,
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
      <Route
        path="/setup"
        element={needsSetup ? <SetupPage /> : <Navigate to={user ? "/" : "/login"} replace />}
      />
      <Route
        path="/invite/:token"
        element={user ? <Navigate to="/" replace /> : <InvitePage />}
      />
      <Route path="/login" element={user ? <Navigate to="/" replace /> : <LoginPage />} />

      {user ? (
        <Route element={<AdminLayout />}>
          <Route
            index
            element={
              <Suspense fallback={<ContentEditorLoadingFallback />}>
                <DashboardPage />
              </Suspense>
            }
          />
          <Route
            path="reports"
            element={
              <Suspense fallback={<ContentEditorLoadingFallback />}>
                <SubmissionsPage />
              </Suspense>
            }
          />
          <Route
            path="shops"
            element={
              <Suspense fallback={<ContentEditorLoadingFallback />}>
                <ShopsPage />
              </Suspense>
            }
          />
          <Route
            path="categories"
            element={
              <Suspense fallback={<ContentEditorLoadingFallback />}>
                <CategoriesPage />
              </Suspense>
            }
          />
          {user.isOwner && (
            <Route
              path="users"
              element={
                <Suspense fallback={<ContentEditorLoadingFallback />}>
                  <UsersPage />
                </Suspense>
              }
            />
          )}
          {user.role !== "moderator" && (
            <>
              <Route
                path="media"
                element={
                  <Suspense fallback={<ContentEditorLoadingFallback />}>
                    <MediaPage />
                  </Suspense>
                }
              />
              <Route
                path="analytics"
                element={
                  <Suspense fallback={<ContentEditorLoadingFallback />}>
                    <AnalyticsPage />
                  </Suspense>
                }
              />
              <Route
                path="forms"
                element={
                  <Suspense fallback={<ContentEditorLoadingFallback />}>
                    <FormBuilderListPage />
                  </Suspense>
                }
              />
              <Route
                path="forms/:name"
                element={
                  <Suspense fallback={<ContentEditorLoadingFallback />}>
                    <FormBuilderEditPage />
                  </Suspense>
                }
              />
              <Route
                path="email-templates"
                element={
                  <Suspense fallback={<ContentEditorLoadingFallback />}>
                    <EmailTemplateListPage />
                  </Suspense>
                }
              />
              <Route
                path="email-templates/new"
                element={
                  <Suspense fallback={<ContentEditorLoadingFallback />}>
                    <EmailTemplateEditPage />
                  </Suspense>
                }
              />
              <Route
                path="email-templates/:id"
                element={
                  <Suspense fallback={<ContentEditorLoadingFallback />}>
                    <EmailTemplateEditPage />
                  </Suspense>
                }
              />
              <Route
                path="pages"
                element={
                  <Suspense fallback={<ContentEditorLoadingFallback />}>
                    <PagesListPage />
                  </Suspense>
                }
              />
              <Route
                path="pages/navigations"
                element={
                  <Suspense fallback={<ContentEditorLoadingFallback />}>
                    <NavManagerPage />
                  </Suspense>
                }
              />
              <Route
                path="footer-builder"
                element={
                  <Suspense fallback={<ContentEditorLoadingFallback />}>
                    <FooterBuilderPage />
                  </Suspense>
                }
              />
              <Route
                path="pages/:slug"
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

/**
 * Root dashboard application shell with routing, providers and layout.
 *
 * @returns Top-level React tree for the admin dashboard SPA.
 */
export default function App() {
  return (
    <I18nProvider>
      <ThemeProvider>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </ThemeProvider>
    </I18nProvider>
  );
}
