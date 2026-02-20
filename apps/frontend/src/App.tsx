import { Routes, Route } from "react-router";
import { HomePage } from "./features/categories/pages/HomePage.tsx";
import { CategoryPage } from "./features/categories/pages/CategoryPage.tsx";
import { SearchPage } from "./features/search/pages/SearchPage.tsx";
import { SuggestPage } from "./features/suggest/pages/SuggestPage.tsx";
import { AboutPage } from "./features/suggest/pages/AboutPage.tsx";
import { ImpressumPage } from "./features/suggest/pages/ImpressumPage.tsx";
import { DatenschutzPage } from "./features/suggest/pages/DatenschutzPage.tsx";

export default function App() {
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
