import { lazy, Suspense, useEffect } from "react";
import { Navigate, Route, Routes, useLocation } from "react-router";
import { CategoryPage } from "./features/categories/pages/CategoryPage.tsx";
import { HomePage } from "./features/categories/pages/HomePage.tsx";
import { SearchPage } from "./features/search/pages/SearchPage.tsx";
import { SuggestPage } from "./features/suggest/pages/SuggestPage.tsx";
import { MarkdownLoadingFallback } from "./components/MarkdownLoadingFallback.tsx";

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
    window.scrollTo(0, 0);
    window.HSStaticMethods?.autoInit?.();
  }, [pathname]);

  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/kategorie/:slug" element={<CategoryPage />} />
      <Route path="/suche" element={<SearchPage />} />
      <Route path="/suggestion" element={<SuggestPage />} />
      {/* Legacy redirect */}
      <Route path="/kriterien" element={<Navigate to="/aufnahmekriterien" replace />} />
      {/* Dynamic CMS pages (catch-all) */}
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
