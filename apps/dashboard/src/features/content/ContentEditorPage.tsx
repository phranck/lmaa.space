import "@mdxeditor/editor/style.css";
import { PageHeader } from "@/components/ui/PageHeader.tsx";
import {
  useAdminContentPage,
  useSaveContentPage,
} from "@/features/content/hooks/useAdminContent.ts";
import {
  AdmonitionDirectiveDescriptor,
  BlockTypeSelect,
  BoldItalicUnderlineToggles,
  CodeToggle,
  CreateLink,
  DiffSourceToggleWrapper,
  InsertAdmonition,
  InsertCodeBlock,
  InsertImage,
  InsertTable,
  InsertThematicBreak,
  ListsToggle,
  MDXEditor,
  Separator,
  StrikeThroughSupSubToggles,
  UndoRedo,
  admonitionsPlugin,
  codeBlockPlugin,
  diffSourcePlugin,
  directivesPlugin,
  headingsPlugin,
  imagePlugin,
  linkDialogPlugin,
  linkPlugin,
  listsPlugin,
  markdownShortcutPlugin,
  quotePlugin,
  tablePlugin,
  thematicBreakPlugin,
  toolbarPlugin,
} from "@mdxeditor/editor";
import { useCallback, useRef, useState } from "react";
import { LuSave } from "react-icons/lu";
import { useParams } from "react-router";

const PAGE_LABELS: Record<string, string> = {
  about: "Über uns",
  impressum: "Impressum",
  datenschutz: "Datenschutzerklärung",
};

export function ContentEditorPage() {
  const { slug = "" } = useParams<{ slug: string }>();
  const { data: page, isLoading } = useAdminContentPage(slug);
  const save = useSaveContentPage(slug);
  const [saved, setSaved] = useState(false);
  const contentRef = useRef<string>("");

  const handleChange = useCallback((markdown: string) => {
    contentRef.current = markdown;
    setSaved(false);
  }, []);

  const handleSave = () => {
    save.mutate(contentRef.current, {
      onSuccess: () => setSaved(true),
    });
  };

  const title = PAGE_LABELS[slug] ?? slug;

  return (
    <>
      <PageHeader title={title}>
        <button
          type="button"
          onClick={handleSave}
          disabled={save.isPending}
          className="flex items-center gap-2 px-4 py-2 bg-[var(--ds-accent)] text-[var(--ds-accent-fg)] rounded-control text-sm font-medium hover:bg-[var(--ds-accent-hover)] disabled:opacity-60 transition-colors"
        >
          <LuSave size={14} />
          {save.isPending ? "Wird gespeichert…" : saved ? "Gespeichert" : "Speichern"}
        </button>
      </PageHeader>

      <div className="flex-1 overflow-hidden">
        {isLoading && (
          <div className="flex items-center justify-center h-64 text-[var(--ds-text-subtle)] text-sm">
            Lade Inhalt…
          </div>
        )}

        {page && (
          <MDXEditor
            key={slug}
            markdown={page.content}
            onChange={handleChange}
            contentEditableClassName="prose prose-sm max-w-none min-h-[60vh] focus:outline-none px-6 py-4"
            plugins={[
              headingsPlugin(),
              listsPlugin(),
              quotePlugin(),
              thematicBreakPlugin(),
              linkPlugin(),
              linkDialogPlugin(),
              imagePlugin(),
              tablePlugin(),
              codeBlockPlugin({ defaultCodeBlockLanguage: "" }),
              directivesPlugin({ directiveDescriptors: [AdmonitionDirectiveDescriptor] }),
              admonitionsPlugin(),
              markdownShortcutPlugin(),
              diffSourcePlugin({ viewMode: "rich-text" }),
              toolbarPlugin({
                toolbarContents: () => (
                  <DiffSourceToggleWrapper>
                    <UndoRedo />
                    <Separator />
                    <BoldItalicUnderlineToggles />
                    <CodeToggle />
                    <StrikeThroughSupSubToggles />
                    <Separator />
                    <ListsToggle />
                    <Separator />
                    <BlockTypeSelect />
                    <Separator />
                    <CreateLink />
                    <InsertImage />
                    <InsertTable />
                    <InsertThematicBreak />
                    <InsertCodeBlock />
                    <InsertAdmonition />
                  </DiffSourceToggleWrapper>
                ),
              }),
            ]}
          />
        )}

        {save.isError && (
          <p className="text-red-500 text-sm text-center mt-4">
            Fehler beim Speichern. Bitte erneut versuchen.
          </p>
        )}
      </div>
    </>
  );
}
