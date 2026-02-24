import "@mdxeditor/editor/style.css";
import { PageHeader } from "@/components/ui/PageHeader.tsx";
import {
  useAdminContentPage,
  useDeleteContentPage,
  usePatchContentPage,
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
import { InternalLinkPicker } from "@/features/content/InternalLinkPicker.tsx";
import { sourceKeymap } from "@/features/content/sourceKeymap.ts";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router";
import { SFMinus, SFPlus, SFSquareAndArrowDownFill, SFTrashFill } from "sf-symbols-lib/monochrome";

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

function slugify(str: string): string {
  return str
    .toLowerCase()
    .replace(/ä/g, "ae")
    .replace(/ö/g, "oe")
    .replace(/ü/g, "ue")
    .replace(/ß/g, "ss")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function ContentEditorPage() {
  const { slug = "" } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { data: page, isLoading } = useAdminContentPage(slug);
  const save = useSaveContentPage(slug);
  const patch = usePatchContentPage(slug);
  const deletePage = useDeleteContentPage();

  const [saved, setSaved] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const contentRef = useRef<string>("");
  const [sourceFontSize, setSourceFontSize] = useState(loadFontSize);

  // Reset stale content when navigating between pages — prevents Cmd+S saving
  // the previous page's content into the newly loaded page's slug.
  useEffect(() => {
    contentRef.current = "";
    setSaved(false);
  }, [slug]);

  // Metadata editing state
  const [editingSlug, setEditingSlug] = useState(false);
  const [editSlugValue, setEditSlugValue] = useState("");
  const [editingTitle, setEditingTitle] = useState(false);
  const [editTitleValue, setEditTitleValue] = useState("");
  const [patchError, setPatchError] = useState<string | null>(null);

  const handleChange = useCallback((markdown: string) => {
    contentRef.current = markdown;
    setSaved(false);
  }, []);

  const handleSave = () => {
    save.mutate(contentRef.current, {
      onSuccess: () => setSaved(true),
    });
  };

  const handleSaveRef = useRef(handleSave);
  handleSaveRef.current = handleSave;

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "s") {
        e.preventDefault();
        handleSaveRef.current();
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const changeFontSize = (delta: number) => {
    setSourceFontSize((prev) => {
      const next = Math.min(FONT_SIZE_MAX, Math.max(FONT_SIZE_MIN, prev + delta));
      localStorage.setItem(FONT_SIZE_KEY, String(next));
      return next;
    });
  };

  async function handlePatch(data: { title?: string; slug?: string; status?: string }) {
    setPatchError(null);
    try {
      const updated = await patch.mutateAsync(data);
      if (data.slug && data.slug !== slug) {
        navigate(`/seiten/${updated.slug}`, { replace: true });
      }
    } catch (err) {
      setPatchError(err instanceof Error ? err.message : "Fehler beim Speichern");
    }
  }

  // biome-ignore lint/correctness/useExhaustiveDependencies: slug from useParams() is reactive; plugins must reinit on route change
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
      diffSourcePlugin({ viewMode: loadViewMode(), codeMirrorExtensions: [sourceKeymap] }),
      realmPlugin({
        postInit(realm) {
          let skip = true;
          realm.sub(viewMode$, (mode) => {
            if (skip) {
              skip = false;
              return;
            }
            localStorage.setItem(VIEW_MODE_KEY, mode);
          });
        },
      })(),
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
            <Separator />
            <InternalLinkPicker />
          </DiffSourceToggleWrapper>
        ),
      }),
    ],
    [slug],
  );

  const title = page?.title ?? slug;

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
              <SFMinus className="w-2.5 h-2.5" />
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
              <SFPlus className="w-2.5 h-2.5" />
            </button>
          </div>

          {/* Delete button */}
          {!confirmDelete ? (
            <button
              type="button"
              onClick={() => setConfirmDelete(true)}
              className="flex items-center gap-2 px-3 py-2 border border-[var(--ds-btn-danger-border)] text-[var(--ds-btn-danger-text)] rounded-control text-sm font-medium hover:bg-[var(--ds-btn-danger-hover-bg)] hover:border-[var(--ds-btn-danger-hover-border)] transition-colors"
              title="Seite löschen"
            >
              <SFTrashFill className="w-3.5 h-3.5" />
            </button>
          ) : (
            <div className="flex items-center gap-2 px-3 py-1.5 border border-[var(--ds-btn-danger-border)] rounded-control bg-[var(--ds-btn-danger-hover-bg)]">
              <span className="text-xs text-[var(--ds-btn-danger-text)] font-medium">Wirklich löschen?</span>
              <button
                type="button"
                onClick={() => {
                  deletePage.mutate(slug, {
                    onSuccess: () => navigate("/seiten"),
                  });
                }}
                disabled={deletePage.isPending}
                className="text-xs font-semibold text-[var(--ds-btn-danger-text)] hover:underline disabled:opacity-60"
              >
                Ja, löschen
              </button>
              <button
                type="button"
                onClick={() => setConfirmDelete(false)}
                className="text-xs text-[var(--ds-text-muted)] hover:underline"
              >
                Abbrechen
              </button>
            </div>
          )}

          {/* Save button */}
          <button
            type="button"
            onClick={handleSave}
            disabled={save.isPending}
            className="flex items-center gap-2 px-4 py-2 bg-[var(--ds-btn-primary-bg)] text-[var(--ds-btn-primary-fg)] rounded-control text-sm font-medium hover:bg-[var(--ds-btn-primary-hover)] disabled:opacity-60 transition-colors"
          >
            <SFSquareAndArrowDownFill className="w-3.5 h-3.5" />
            {save.isPending ? "Wird gespeichert…" : saved ? "Gespeichert" : "Speichern"}
          </button>
        </div>
      </PageHeader>

      {/* Metadata bar */}
      {page && (
        <div className="border-b border-[var(--ds-border)] px-6 py-3 flex flex-wrap items-center gap-6 text-xs text-[var(--ds-text-muted)] bg-[var(--ds-surface)]">
          {/* Title */}
          <div className="flex items-center gap-2">
            <span className="font-medium">Titel:</span>
            {editingTitle ? (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handlePatch({ title: editTitleValue });
                  setEditingTitle(false);
                }}
                className="flex items-center gap-1"
              >
                <input
                  type="text"
                  value={editTitleValue}
                  onChange={(e) => setEditTitleValue(e.target.value)}
                  autoFocus
                  className="px-2 py-0.5 text-xs bg-[var(--ds-input-bg)] border border-[var(--color-primary)] rounded text-[var(--ds-text)] focus:outline-none w-48"
                />
                <button type="submit" className="text-[var(--color-primary)] hover:underline">
                  OK
                </button>
                <button
                  type="button"
                  onClick={() => setEditingTitle(false)}
                  className="hover:underline"
                >
                  Abbrechen
                </button>
              </form>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setEditTitleValue(page.title);
                  setEditingTitle(true);
                }}
                className="hover:underline text-[var(--ds-text)]"
              >
                {page.title}
              </button>
            )}
          </div>

          {/* Slug */}
          <div className="flex items-center gap-2">
            <span className="font-medium">Slug:</span>
            {editingSlug ? (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handlePatch({ slug: editSlugValue });
                  setEditingSlug(false);
                }}
                className="flex items-center gap-1"
              >
                <span className="text-[var(--ds-text-muted)]">/</span>
                <input
                  type="text"
                  value={editSlugValue}
                  onChange={(e) => setEditSlugValue(e.target.value)}
                  onBlur={(e) => setEditSlugValue(slugify(e.target.value))}
                  autoFocus
                  pattern="[a-z0-9-]+"
                  className="px-2 py-0.5 text-xs bg-[var(--ds-input-bg)] border border-[var(--color-primary)] rounded text-[var(--ds-text)] focus:outline-none font-mono w-40"
                />
                <button type="submit" className="text-[var(--color-primary)] hover:underline">
                  OK
                </button>
                <button
                  type="button"
                  onClick={() => setEditingSlug(false)}
                  className="hover:underline"
                >
                  Abbrechen
                </button>
              </form>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setEditSlugValue(page.slug);
                  setEditingSlug(true);
                }}
                className="hover:underline font-mono text-[var(--ds-text)]"
              >
                /{page.slug}
              </button>
            )}
          </div>

          {/* Status */}
          <div className="flex items-center gap-2">
            <span className="font-medium">Status:</span>
            <select
              value={page.status}
              onChange={(e) => handlePatch({ status: e.target.value })}
              className="text-xs bg-[var(--ds-input-bg)] border border-[var(--ds-border)] rounded px-1.5 py-0.5 text-[var(--ds-text)] focus:outline-none cursor-pointer"
            >
              <option value="draft">Entwurf</option>
              <option value="published">Veröffentlicht</option>
              <option value="hidden">Versteckt</option>
            </select>
          </div>

          {/* Audit info */}
          {page.createdByUsername && (
            <div className="ml-auto">
              Erstellt von <span className="text-[var(--ds-text)]">{page.createdByUsername}</span>
              {page.updatedByUsername && (
                <> · Geändert von <span className="text-[var(--ds-text)]">{page.updatedByUsername}</span></>
              )}
            </div>
          )}

          {patchError && (
            <span className="text-red-500">{patchError}</span>
          )}
        </div>
      )}

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
            contentEditableClassName="prose prose-stone prose-sm dark:prose-invert max-w-none prose-a:text-amber-700 dark:prose-a:text-amber-500 min-h-[60vh] focus:outline-none"
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
