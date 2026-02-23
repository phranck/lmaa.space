import { PageLayout } from "@/components/layout/PageLayout.tsx";
import { useContentPage } from "@/features/content/hooks/useContentPage.ts";
import { usePageMeta } from "@/hooks/usePageMeta.ts";
import ReactMarkdown from "react-markdown";

export function DatenschutzPage() {
  usePageMeta({ title: "Datenschutzerklärung", canonicalPath: "/datenschutz" });

  const { data: page } = useContentPage("datenschutz");

  return (
    <PageLayout>
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-14">
        <h1 className="font-serif text-3xl font-semibold text-stone-900 mb-2">
          Datenschutzerklärung
        </h1>
        <p className="text-sm text-stone-400 mb-10">
          Gem. Art. 13 und 14 DSGVO sowie § 1 DSG (Österreich)
        </p>
        {page && (
          <ReactMarkdown className="prose prose-stone prose-sm max-w-none prose-a:text-amber-700 prose-a:no-underline hover:prose-a:underline prose-headings:font-serif">
            {page.content}
          </ReactMarkdown>
        )}
      </div>
    </PageLayout>
  );
}
