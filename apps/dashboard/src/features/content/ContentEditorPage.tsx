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
  type ViewMode,
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
  realmPlugin,
  tablePlugin,
  thematicBreakPlugin,
  toolbarPlugin,
  viewMode$,
} from "@mdxeditor/editor";
import { useCallback, useMemo, useRef, useState } from "react";
import { LuMinus, LuPlus, LuSave } from "react-icons/lu";
import { useParams } from "react-router";

const PAGE_LABELS: Record<string, string> = {
  about: "Über uns",
  impressum: "Impressum",
  datenschutz: "Datenschutzerklärung",
};

const VIEW_MODE_KEY = "content-editor-view-mode";
const FONT_SIZE_KEY = "content-editor-source-font-size";
const FONT_SIZE_MIN = 10;
const FONT_SIZE_MAX = 24;
const FONT_SIZE_DEFAULT = 13;

function loadViewMode(): ViewMode {
  const stored = localStorage.getItem(VIEW_MODE_KEY);
  return stored === "source" || stored === "diff" ? stored : "rich-text";
}

function loadFontSize(): number {
  const stored = localStorage.getItem(FONT_SIZE_KEY);
  const parsed = stored ? Number(stored) : Number.NaN;
  return Number.isNaN(parsed)
    ? FONT_SIZE_DEFAULT
    : Math.min(FONT_SIZE_MAX, Math.max(FONT_SIZE_MIN, parsed));
}

export function ContentEditorPage() {
  const { slug = "" } = useParams<{ slug: string }>();
  const { data: page, isLoading } = useAdminContentPage(slug);
  const save = useSaveContentPage(slug);
  const [saved, setSaved] = useState(false);
  const contentRef = useRef<string>("");
  const [sourceFontSize, setSourceFontSize] = useState(loadFontSize);

  const handleChange = useCallback((markdown: string) => {
    contentRef.current = markdown;
    setSaved(false);
  }, []);

  const handleSave = () => {
    save.mutate(contentRef.current, {
      onSuccess: () => setSaved(true),
    });
  };

  const changeFontSize = (delta: number) => {
    setSourceFontSize((prev) => {
      const next = Math.min(FONT_SIZE_MAX, Math.max(FONT_SIZE_MIN, prev + delta));
      localStorage.setItem(FONT_SIZE_KEY, String(next));
      return next;
    });
  };

  const title = PAGE_LABELS[slug] ?? slug;

  const plugins = useMemo(
    () => [
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
      markdownShortcutPlugin(),
      diffSourcePlugin({ viewMode: loadViewMode() }),
      realmPlugin({
        postInit(realm) {
          realm.sub(viewMode$, (mode) => {
            localStorage.setItem(VIEW_MODE_KEY, mode);
          });
        },
      }),
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
    ],
    [],
  );

  return (
    <>
      <PageHeader title={title}>
        <div className="flex items-center gap-3">
          {/* Source font size control */}
          <div className="flex items-center gap-1 border border-[var(--ds-border)] rounded-control px-2 py-1.5 text-[var(--ds-text-muted)]">
            <span className="text-xs font-medium mr-1 select-none">Aa</span>
            <button
              type="button"
              onClick={() => changeFontSize(-1)}
              disabled={sourceFontSize <= FONT_SIZE_MIN}
              className="w-5 h-5 flex items-center justify-center rounded hover:bg-[var(--ds-surface-hover)] disabled:opacity-30 transition-colors"
              title="Schriftgröße verkleinern"
            >
              <LuMinus size={11} />
            </button>
            <span className="w-8 text-center text-xs tabular-nums select-none">
              {sourceFontSize}px
            </span>
            <button
              type="button"
              onClick={() => changeFontSize(+1)}
              disabled={sourceFontSize >= FONT_SIZE_MAX}
              className="w-5 h-5 flex items-center justify-center rounded hover:bg-[var(--ds-surface-hover)] disabled:opacity-30 transition-colors"
              title="Schriftgröße vergrößern"
            >
              <LuPlus size={11} />
            </button>
          </div>

          {/* Save button */}
          <button
            type="button"
            onClick={handleSave}
            disabled={save.isPending}
            className="flex items-center gap-2 px-4 py-2 bg-[var(--ds-accent)] text-[var(--ds-accent-fg)] rounded-control text-sm font-medium hover:bg-[var(--ds-accent-hover)] disabled:opacity-60 transition-colors"
          >
            <LuSave size={14} />
            {save.isPending ? "Wird gespeichert…" : saved ? "Gespeichert" : "Speichern"}
          </button>
        </div>
      </PageHeader>

      <div
        className="flex-1 overflow-hidden"
        style={{ "--source-font-size": `${sourceFontSize}px` } as React.CSSProperties}
      >
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
            contentEditableClassName="prose prose-stone prose-sm max-w-none prose-a:text-amber-700 min-h-[60vh] focus:outline-none px-6 py-4"
            plugins={plugins}
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
