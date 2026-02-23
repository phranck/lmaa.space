import { useEffect } from "react";
import { Route, Routes, useLocation } from "react-router";
import { CategoryPage } from "./features/categories/pages/CategoryPage.tsx";
import { HomePage } from "./features/categories/pages/HomePage.tsx";
import { MarkdownContentPage } from "./features/content/MarkdownContentPage.tsx";
import { SearchPage } from "./features/search/pages/SearchPage.tsx";
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
      <Route
        path="/ueber-uns"
        element={
          <MarkdownContentPage
            slug="about"
            title="Über lmaa.space"
            canonicalPath="/ueber-uns"
            description="lmaa.space ist ein Community-Verzeichnis fairer und nachhaltiger Amazon-Alternativen für den DACH-Raum."
          />
        }
      />
      <Route
        path="/impressum"
        element={
          <MarkdownContentPage slug="impressum" title="Impressum" canonicalPath="/impressum" />
        }
      />
      <Route
        path="/datenschutz"
        element={
          <MarkdownContentPage
            slug="datenschutz"
            title="Datenschutzerklärung"
            canonicalPath="/datenschutz"
            subtitle="Gem. Art. 13 und 14 DSGVO sowie § 1 DSG (Österreich)"
          />
        }
      />
      <Route
        path="/aufnahmekriterien"
        element={
          <MarkdownContentPage
            slug="aufnahmekriterien"
            title="Aufnahmekriterien"
            canonicalPath="/aufnahmekriterien"
          />
        }
      />
      <Route
        path="/kriterien"
        element={
          <MarkdownContentPage
            slug="aufnahmekriterien"
            title="Aufnahmekriterien"
            canonicalPath="/aufnahmekriterien"
          />
        }
      />
    </Routes>
  );
}
