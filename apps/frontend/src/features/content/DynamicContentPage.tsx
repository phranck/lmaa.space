import { PageLayout } from "@/components/layout/PageLayout.tsx";
import { useContentPage } from "@/features/content/hooks/useContentPage.ts";
import { usePageMeta } from "@/hooks/usePageMeta.ts";
import ReactMarkdown from "react-markdown";
import { useParams } from "react-router";

export function DynamicContentPage() {
  const { slug = "" } = useParams<{ slug: string }>();
  const { data: page, isLoading, isError } = useContentPage(slug);

  usePageMeta({
    title: page?.title ?? slug,
    canonicalPath: `/${slug}`,
  });

  if (isLoading) {
    return (
      <PageLayout>
        <div className="max-w-2xl mx-auto px-4 sm:px-6 py-14">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-stone-200 rounded w-1/2" />
            <div className="h-4 bg-stone-100 rounded w-full" />
            <div className="h-4 bg-stone-100 rounded w-5/6" />
          </div>
        </div>
      </PageLayout>
    );
  }

  if (isError || !page) {
    return (
      <PageLayout>
        <div className="max-w-2xl mx-auto px-4 sm:px-6 py-14 text-center">
          <h1 className="font-serif text-3xl font-semibold text-stone-900 mb-4">Seite nicht gefunden</h1>
          <p className="text-stone-500">Die angeforderte Seite existiert nicht oder ist nicht öffentlich zugänglich.</p>
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout>
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-14">
        <h1 className="font-serif text-3xl font-semibold text-stone-900 mb-10">{page.title}</h1>
        <div className="prose prose-stone prose-base max-w-none prose-a:text-amber-700 prose-a:no-underline hover:prose-a:underline prose-headings:font-serif">
          <ReactMarkdown>{page.content}</ReactMarkdown>
        </div>
      </div>
    </PageLayout>
  );
}
