import { useEffect } from "react";
import { Route, Routes, useLocation } from "react-router";
import { CategoryPage } from "./features/categories/pages/CategoryPage.tsx";
import { HomePage } from "./features/categories/pages/HomePage.tsx";
import { SearchPage } from "./features/search/pages/SearchPage.tsx";
import { AboutPage } from "./features/suggest/pages/AboutPage.tsx";
import { DatenschutzPage } from "./features/suggest/pages/DatenschutzPage.tsx";
import { ImpressumPage } from "./features/suggest/pages/ImpressumPage.tsx";
import { SuggestPage } from "./features/suggest/pages/SuggestPage.tsx";

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
      <Route path="/ueber-uns" element={<AboutPage />} />
      <Route path="/impressum" element={<ImpressumPage />} />
      <Route path="/datenschutz" element={<DatenschutzPage />} />
    </Routes>
  );
}
