import { lazy, Suspense, useEffect } from "react";
import { Route, Routes, useLocation } from "react-router";
import { CategoryPage } from "./features/categories/pages/CategoryPage.tsx";
import { HomePage } from "./features/categories/pages/HomePage.tsx";
import { SearchPage } from "./features/search/pages/SearchPage.tsx";
import { SuggestPage } from "./features/suggest/pages/SuggestPage.tsx";
import { MarkdownLoadingFallback } from "./components/MarkdownLoadingFallback.tsx";

const MarkdownContentPage = lazy(() =>
  import("./features/content/MarkdownContentPage.tsx").then((m) => ({
    default: m.MarkdownContentPage,
  })),
);

const DynamicContentPage = lazy(() =>
  import("./features/content/DynamicContentPage.tsx").then((m) => ({
    default: m.DynamicContentPage,
  })),
);

declare global {
  interface Window {
    HSStaticMethods?: { autoInit: () => void };
  }
}

export default function App() {
  const { pathname } = useLocation();

  // biome-ignore lint/correctness/useExhaustiveDependencies: HSStaticMethods is a global, not a React dependency
  useEffect(() => {
    window.HSStaticMethods?.autoInit?.();
  }, [pathname]);

  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/kategorie/:slug" element={<CategoryPage />} />
      <Route path="/suche" element={<SearchPage />} />
      <Route path="/vorschlagen" element={<SuggestPage />} />
      <Route
        path="/ueber-uns"
        element={
          <Suspense fallback={<MarkdownLoadingFallback />}>
            <MarkdownContentPage
              slug="about"
              title="Über lmaa.space"
              canonicalPath="/ueber-uns"
              description="lmaa.space ist ein Community-Verzeichnis fairer und nachhaltiger Amazon-Alternativen für den DACH-Raum."
            />
          </Suspense>
        }
      />
      <Route
        path="/impressum"
        element={
          <Suspense fallback={<MarkdownLoadingFallback />}>
            <MarkdownContentPage slug="impressum" title="Impressum" canonicalPath="/impressum" />
          </Suspense>
        }
      />
      <Route
        path="/datenschutz"
        element={
          <Suspense fallback={<MarkdownLoadingFallback />}>
            <MarkdownContentPage
              slug="datenschutz"
              title="Datenschutzerklärung"
              canonicalPath="/datenschutz"
              subtitle="Gem. Art. 13 und 14 DSGVO sowie § 1 DSG (Österreich)"
            />
          </Suspense>
        }
      />
      <Route
        path="/aufnahmekriterien"
        element={
          <Suspense fallback={<MarkdownLoadingFallback />}>
            <MarkdownContentPage
              slug="aufnahmekriterien"
              title="Aufnahmekriterien"
              canonicalPath="/aufnahmekriterien"
            />
          </Suspense>
        }
      />
      <Route
        path="/kriterien"
        element={
          <Suspense fallback={<MarkdownLoadingFallback />}>
            <MarkdownContentPage
              slug="aufnahmekriterien"
              title="Aufnahmekriterien"
              canonicalPath="/aufnahmekriterien"
            />
          </Suspense>
        }
      />
      {/* Catch-all: dynamic CMS pages */}
      <Route
        path="/:slug"
        element={
          <Suspense fallback={<MarkdownLoadingFallback />}>
            <DynamicContentPage />
          </Suspense>
        }
      />
    </Routes>
  );
}
