import { Suspense, lazy } from "react";
import { Navigate, Route, Routes } from "react-router";

import { ContentEditorLoadingFallback } from "@/components/app/ContentEditorLoadingFallback.tsx";
import { I18nProvider } from "@/context/I18nContext.tsx";
import { ThemeProvider } from "@/context/ThemeContext.tsx";
import { AuthProvider, useAuth } from "@/features/auth/AuthContext.tsx";
import { KeyboardSaveProvider } from "@/lib/hooks/useKeyboardSave.ts";

const AdminLayout = lazy(() =>
  import("@/components/layout/AdminLayout.tsx").then((m) => ({
    default: m.AdminLayout,
  })),
);

const InvitePage = lazy(() =>
  import("@/features/auth/InvitePage.tsx").then((m) => ({
    default: m.InvitePage,
  })),
);

const LoginPage = lazy(() =>
  import("@/features/auth/LoginPage.tsx").then((m) => ({
    default: m.LoginPage,
  })),
);

const SetupPage = lazy(() =>
  import("@/features/auth/SetupPage.tsx").then((m) => ({
    default: m.SetupPage,
  })),
);

const CategoriesPage = lazy(() =>
  import("@/features/content/categories/CategoriesPage.tsx").then((m) => ({
    default: m.CategoriesPage,
  })),
);

const LandingPagePage = lazy(() =>
  import("@/features/content/landing-page/LandingPagePage.tsx").then((m) => ({
    default: m.LandingPagePage,
  })),
);

const ShopsPage = lazy(() =>
  import("@/features/content/shops/ShopsPage.tsx").then((m) => ({
    default: m.ShopsPage,
  })),
);

const ShopEditorPage = lazy(() =>
  import("@/features/content/shops/ShopEditorPage.tsx").then((m) => ({
    default: m.ShopEditorPage,
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

const SubmissionEditorPage = lazy(() =>
  import("@/features/overview/SubmissionEditorPage.tsx").then((m) => ({
    default: m.SubmissionEditorPage,
  })),
);

const UsersPage = lazy(() =>
  import("@/features/system/users/UsersPage.tsx").then((m) => ({
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

const MarkdownWidgetsPage = lazy(() =>
  import("@/features/system/MarkdownWidgetsPage.tsx").then((m) => ({
    default: m.MarkdownWidgetsPage,
  })),
);

const BillingPage = lazy(() =>
  import("@/features/system/billing/BillingPage.tsx").then((m) => ({
    default: m.BillingPage,
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

const MastodonPostTemplateListPage = lazy(() =>
  import("@/features/templates/mastodon-post-templates/MastodonPostTemplateListPage.tsx").then(
    (m) => ({
      default: m.MastodonPostTemplateListPage,
    }),
  ),
);

const MastodonPostTemplateEditPage = lazy(() =>
  import("@/features/templates/mastodon-post-templates/MastodonPostTemplateEditPage.tsx").then(
    (m) => ({
      default: m.MastodonPostTemplateEditPage,
    }),
  ),
);

const FooterBuilderPage = lazy(() =>
  import("@/features/content/footer-builder/FooterBuilderPage.tsx").then((m) => ({
    default: m.FooterBuilderPage,
  })),
);

const AffiliateListPage = lazy(() =>
  import("@/features/affiliate/AffiliateListPage.tsx").then((m) => ({
    default: m.AffiliateListPage,
  })),
);

const AffiliateSettingsPage = lazy(() =>
  import("@/features/affiliate/AffiliateSettingsPage.tsx").then((m) => ({
    default: m.AffiliateSettingsPage,
  })),
);

const SystemSettingsPage = lazy(() =>
  import("@/features/system/settings/SystemSettingsPage.tsx").then((m) => ({
    default: m.SystemSettingsPage,
  })),
);

const BackgroundErrorsPage = lazy(() =>
  import("@/features/system/BackgroundErrorsPage.tsx").then((m) => ({
    default: m.BackgroundErrorsPage,
  })),
);

const SocialMediaAccountsPage = lazy(() =>
  import("@/features/social/SocialMediaAccountsPage.tsx").then((m) => ({
    default: m.SocialMediaAccountsPage,
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
        element={
          needsSetup ? (
            <Suspense fallback={<ContentEditorLoadingFallback />}>
              <SetupPage />
            </Suspense>
          ) : (
            <Navigate to={user ? "/" : "/login"} replace />
          )
        }
      />
      <Route
        path="/invite/:token"
        element={
          user ? (
            <Navigate to="/" replace />
          ) : (
            <Suspense fallback={<ContentEditorLoadingFallback />}>
              <InvitePage />
            </Suspense>
          )
        }
      />
      <Route
        path="/login"
        element={
          user ? (
            <Navigate to="/" replace />
          ) : (
            <Suspense fallback={<ContentEditorLoadingFallback />}>
              <LoginPage />
            </Suspense>
          )
        }
      />

      {user ? (
        <Route
          element={
            <Suspense fallback={<ContentEditorLoadingFallback />}>
              <AdminLayout />
            </Suspense>
          }
        >
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
            path="reports/:tab"
            element={
              <Suspense fallback={<ContentEditorLoadingFallback />}>
                <SubmissionsPage />
              </Suspense>
            }
          />
          <Route
            path="reports/suggestions/:submissionId"
            element={
              <Suspense fallback={<ContentEditorLoadingFallback />}>
                <SubmissionEditorPage />
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
            path="shops/:shopId"
            element={
              <Suspense fallback={<ContentEditorLoadingFallback />}>
                <ShopEditorPage />
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
          <Route
            path="landing-page"
            element={
              <Suspense fallback={<ContentEditorLoadingFallback />}>
                <LandingPagePage />
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
                path="mastodon-post-templates"
                element={
                  <Suspense fallback={<ContentEditorLoadingFallback />}>
                    <MastodonPostTemplateListPage />
                  </Suspense>
                }
              />
              <Route
                path="mastodon-post-templates/new"
                element={
                  <Suspense fallback={<ContentEditorLoadingFallback />}>
                    <MastodonPostTemplateEditPage />
                  </Suspense>
                }
              />
              <Route
                path="mastodon-post-templates/:id"
                element={
                  <Suspense fallback={<ContentEditorLoadingFallback />}>
                    <MastodonPostTemplateEditPage />
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
                path="markdown-widgets"
                element={
                  <Suspense fallback={<ContentEditorLoadingFallback />}>
                    <MarkdownWidgetsPage />
                  </Suspense>
                }
              />
              <Route
                path="billing"
                element={
                  <Suspense fallback={<ContentEditorLoadingFallback />}>
                    <BillingPage />
                  </Suspense>
                }
              />
              <Route
                path="system/settings"
                element={
                  <Suspense fallback={<ContentEditorLoadingFallback />}>
                    <SystemSettingsPage />
                  </Suspense>
                }
              />
              <Route
                path="system/background-errors"
                element={
                  <Suspense fallback={<ContentEditorLoadingFallback />}>
                    <BackgroundErrorsPage />
                  </Suspense>
                }
              />
              <Route
                path="social-media/accounts"
                element={
                  <Suspense fallback={<ContentEditorLoadingFallback />}>
                    <SocialMediaAccountsPage />
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
                path="affiliate"
                element={
                  <Suspense fallback={<ContentEditorLoadingFallback />}>
                    <AffiliateListPage />
                  </Suspense>
                }
              />
              <Route
                path="affiliate/settings"
                element={
                  <Suspense fallback={<ContentEditorLoadingFallback />}>
                    <AffiliateSettingsPage />
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
    <AuthProvider>
      <I18nProvider>
        <ThemeProvider>
          <KeyboardSaveProvider>
            <AppRoutes />
          </KeyboardSaveProvider>
        </ThemeProvider>
      </I18nProvider>
    </AuthProvider>
  );
}
