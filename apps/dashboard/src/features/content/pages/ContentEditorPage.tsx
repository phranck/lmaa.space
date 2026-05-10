import {
  DownloadIcon,
  EyeIcon,
  MarkdownLogoIcon,
  MinusCircleIcon,
  PlusCircleIcon,
  TrashIcon,
} from "@phosphor-icons/react";
import { Suspense, lazy, useCallback, useEffect, useReducer } from "react";
import { useNavigate, useParams } from "react-router";

import type { ContentPage } from "@lmaa/shared";
import { DashboardSection } from "@lmaa/ui";

const MarkdownEditor = lazy(() =>
  import("@lmaa/ui").then((m) => ({ default: m.MarkdownEditor })),
);

import { DashboardCombobox } from "@/components/ui/DashboardControls.tsx";
import { HeaderBackButton } from "@/components/ui/HeaderBackButton.tsx";
import { PageHeader } from "@/components/ui/PageHeader.tsx";
import { PageBody, PageLayout } from "@/components/ui/PageLayout.tsx";
import { useI18n } from "@/context/I18nContext.tsx";
import {
  useAdminContentPage,
  useDeleteContentPage,
  usePatchContentPage,
  useSaveContentPage,
} from "@/features/content/hooks/useAdminContent.ts";
import { FRONTEND_URL } from "@/lib/env.ts";
import { useKeyboardSave } from "@/lib/hooks/useKeyboardSave.ts";

const FONT_SIZE_KEY = "content-editor-source-font-size";
const FONT_SIZE_MIN = 10;
const FONT_SIZE_MAX = 24;
const FONT_SIZE_DEFAULT = 13;

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

interface EditorState {
  saved: boolean;
  confirmDelete: boolean;
  sourceFontSize: number;
  editingSlug: boolean;
  editSlugValue: string;
  editingTitle: boolean;
  editTitleValue: string;
  patchError: string | null;
  draftContent: string | null;
}

type EditorAction =
  | { type: "resetForSlug" }
  | { type: "setSaved"; value: boolean }
  | { type: "setConfirmDelete"; value: boolean }
  | { type: "setSourceFontSize"; value: number }
  | { type: "setEditingSlug"; value: boolean }
  | { type: "setEditSlugValue"; value: string }
  | { type: "setEditingTitle"; value: boolean }
  | { type: "setEditTitleValue"; value: string }
  | { type: "setPatchError"; value: string | null }
  | { type: "setDraftContent"; value: string | null };

function createInitialEditorState(): EditorState {
  return {
    saved: false,
    confirmDelete: false,
    sourceFontSize: loadFontSize(),
    editingSlug: false,
    editSlugValue: "",
    editingTitle: false,
    editTitleValue: "",
    patchError: null,
    draftContent: null,
  };
}

function editorReducer(state: EditorState, action: EditorAction): EditorState {
  switch (action.type) {
    case "resetForSlug":
      return {
        ...state,
        saved: false,
        confirmDelete: false,
        editingSlug: false,
        editingTitle: false,
        patchError: null,
        draftContent: null,
      };
    case "setSaved":
      return { ...state, saved: action.value };
    case "setConfirmDelete":
      return { ...state, confirmDelete: action.value };
    case "setSourceFontSize":
      return { ...state, sourceFontSize: action.value };
    case "setEditingSlug":
      return { ...state, editingSlug: action.value };
    case "setEditSlugValue":
      return { ...state, editSlugValue: action.value };
    case "setEditingTitle":
      return { ...state, editingTitle: action.value };
    case "setEditTitleValue":
      return { ...state, editTitleValue: action.value };
    case "setPatchError":
      return { ...state, patchError: action.value };
    case "setDraftContent":
      return { ...state, draftContent: action.value };
    default:
      return state;
  }
}

interface EditorHeaderActionsProps {
  sourceFontSize: number;
  canIncreaseFont: boolean;
  canDecreaseFont: boolean;
  confirmDelete: boolean;
  isDeleting: boolean;
  isSaving: boolean;
  saved: boolean;
  common: {
    cancel: string;
    save: string;
    saving: string;
  };
  editorMessages: {
    decreaseFontSize: string;
    increaseFontSize: string;
    deletePage: string;
    confirmDelete: string;
    confirmDeleteAction: string;
    saved: string;
    preview: string;
  };
  onDecreaseFont: () => void;
  onIncreaseFont: () => void;
  onOpenDelete: () => void;
  onCancelDelete: () => void;
  onConfirmDelete: () => void;
  onSave: () => void;
  onPreview: () => void;
}

function EditorHeaderActions({
  sourceFontSize,
  canIncreaseFont,
  canDecreaseFont,
  confirmDelete,
  isDeleting,
  isSaving,
  saved,
  common,
  editorMessages,
  onDecreaseFont,
  onIncreaseFont,
  onOpenDelete,
  onCancelDelete,
  onConfirmDelete,
  onSave,
  onPreview,
}: EditorHeaderActionsProps) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex items-center gap-1 border border-[var(--ds-border)] rounded-control px-2 py-1.5 text-[var(--ds-text-muted)]">
        <span className="text-xs font-medium mr-1 select-none">Aa</span>
        <button
          type="button"
          onClick={onDecreaseFont}
          disabled={!canDecreaseFont}
          className="flex size-5 items-center justify-center rounded hover:bg-[var(--ds-surface-hover)] disabled:opacity-30"
          title={editorMessages.decreaseFontSize}
        >
          <MinusCircleIcon weight="duotone" className="size-3.5" />
        </button>
        <span className="w-8 text-center text-xs tabular-nums select-none">{sourceFontSize}px</span>
        <button
          type="button"
          onClick={onIncreaseFont}
          disabled={!canIncreaseFont}
          className="flex size-5 items-center justify-center rounded hover:bg-[var(--ds-surface-hover)] disabled:opacity-30"
          title={editorMessages.increaseFontSize}
        >
          <PlusCircleIcon weight="duotone" className="size-3.5" />
        </button>
      </div>

      <button
        type="button"
        onClick={onPreview}
        className="flex items-center gap-2 px-3 h-8 min-w-8 border border-[var(--ds-border)] text-[var(--ds-text-muted)] rounded-control text-sm font-medium hover:border-[var(--ds-border-strong)] hover:text-[var(--ds-text)]"
      >
        <EyeIcon weight="duotone" className="size-3.5" />
        {editorMessages.preview}
      </button>

      <button
        type="button"
        onClick={onSave}
        disabled={isSaving}
        className="flex items-center gap-2 h-8 min-w-8 px-4 border border-[var(--ds-btn-primary-border)] text-[var(--ds-btn-primary-text)] rounded-control text-sm font-medium hover:border-[var(--ds-btn-primary-hover-border)] hover:bg-[var(--ds-btn-primary-hover-bg)] disabled:opacity-60"
      >
        <DownloadIcon weight="duotone" className="size-3.5" />
        {saved ? editorMessages.saved : common.save}
      </button>

      {!confirmDelete ? (
        <button
          type="button"
          onClick={onOpenDelete}
          className="flex size-8 items-center justify-center border border-[var(--ds-btn-danger-border)] text-[var(--ds-btn-danger-text)] rounded-control text-sm font-medium hover:bg-[var(--ds-btn-danger-hover-bg)] hover:border-[var(--ds-btn-danger-hover-border)]"
          title={editorMessages.deletePage}
        >
          <TrashIcon weight="duotone" className="size-3.5" />
        </button>
      ) : (
        <div className="flex items-center gap-2 px-3 h-8 border border-[var(--ds-btn-danger-border)] rounded-control bg-[var(--ds-btn-danger-hover-bg)]">
          <span className="text-xs text-[var(--ds-btn-danger-text)] font-medium">
            {editorMessages.confirmDelete}
          </span>
          <button
            type="button"
            onClick={onConfirmDelete}
            disabled={isDeleting}
            className="text-xs font-semibold text-[var(--ds-btn-danger-text)] hover:underline disabled:opacity-60"
          >
            {editorMessages.confirmDeleteAction}
          </button>
          <button
            type="button"
            onClick={onCancelDelete}
            className="text-xs text-[var(--ds-text-muted)] hover:underline"
          >
            {common.cancel}
          </button>
        </div>
      )}
    </div>
  );
}

interface EditorMetadataBarProps {
  page: ContentPage;
  patchError: string | null;
  editingTitle: boolean;
  editTitleValue: string;
  editingSlug: boolean;
  editSlugValue: string;
  editorMessages: {
    titleLabel: string;
    slugLabel: string;
    statusLabel: string;
    showTitleLabel: string;
    ok: string;
    statusDraft: string;
    statusPublished: string;
    statusHidden: string;
    createdBy: string;
    updatedBy: string;
  };
  common: {
    cancel: string;
  };
  onStartEditTitle: () => void;
  onTitleValueChange: (value: string) => void;
  onSaveTitle: () => void;
  onCancelTitle: () => void;
  onStartEditSlug: () => void;
  onSlugValueChange: (value: string) => void;
  onSlugBlur: (value: string) => void;
  onSaveSlug: () => void;
  onCancelSlug: () => void;
  onStatusChange: (value: string) => void;
  onShowTitleChange: (value: boolean) => void;
}

function EditorMetadataBar({
  page,
  patchError,
  editingTitle,
  editTitleValue,
  editingSlug,
  editSlugValue,
  editorMessages,
  common,
  onStartEditTitle,
  onTitleValueChange,
  onSaveTitle,
  onCancelTitle,
  onStartEditSlug,
  onSlugValueChange,
  onSlugBlur,
  onSaveSlug,
  onCancelSlug,
  onStatusChange,
  onShowTitleChange,
}: EditorMetadataBarProps) {
  return (
    <div className="border-b border-[var(--ds-border)] px-6 py-3 flex flex-wrap items-center gap-6 text-xs text-[var(--ds-text-muted)] bg-[var(--ds-surface)]">
      <div className="flex items-center gap-2">
        <span className="font-medium">{editorMessages.titleLabel}:</span>
        {editingTitle ? (
          <div className="flex items-center gap-1">
            <input
              type="text"
              value={editTitleValue}
              onChange={(e) => onTitleValueChange(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") onSaveTitle();
              }}
              className="px-2 py-0.5 text-xs bg-[var(--ds-input-bg)] border border-[var(--color-primary)] rounded text-[var(--ds-text)] focus:outline-none w-48"
            />
            <button
              type="button"
              onClick={onSaveTitle}
              className="text-[var(--color-primary)] hover:underline"
            >
              {editorMessages.ok}
            </button>
            <button type="button" onClick={onCancelTitle} className="hover:underline">
              {common.cancel}
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={onStartEditTitle}
            className="hover:underline text-[var(--ds-text)]"
          >
            {page.title}
          </button>
        )}
      </div>

      <div className="flex items-center gap-2">
        <span className="font-medium">{editorMessages.slugLabel}:</span>
        {editingSlug ? (
          <div className="flex items-center gap-1">
            <span className="text-[var(--ds-text-muted)]">/</span>
            <input
              type="text"
              value={editSlugValue}
              onChange={(e) => onSlugValueChange(e.target.value)}
              onBlur={(e) => onSlugBlur(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") onSaveSlug();
              }}
              pattern="[a-z0-9-]+"
              className="px-2 py-0.5 text-xs bg-[var(--ds-input-bg)] border border-[var(--color-primary)] rounded text-[var(--ds-text)] focus:outline-none font-mono w-40"
            />
            <button
              type="button"
              onClick={onSaveSlug}
              className="text-[var(--color-primary)] hover:underline"
            >
              {editorMessages.ok}
            </button>
            <button type="button" onClick={onCancelSlug} className="hover:underline">
              {common.cancel}
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={onStartEditSlug}
            className="hover:underline font-mono text-[var(--ds-text)]"
          >
            /{page.slug}
          </button>
        )}
      </div>

      <div className="flex items-center gap-2">
        <span className="font-medium">{editorMessages.statusLabel}:</span>
        <DashboardCombobox
          value={page.status}
          onValueChange={onStatusChange}
          className="w-32"
          options={[
            { value: "draft", label: editorMessages.statusDraft },
            { value: "published", label: editorMessages.statusPublished },
            { value: "hidden", label: editorMessages.statusHidden },
          ]}
        />
      </div>

      <label className="flex items-center gap-1.5 cursor-pointer">
        <input
          type="checkbox"
          checked={page.showTitle}
          onChange={(e) => onShowTitleChange(e.target.checked)}
          className="accent-[var(--color-primary)] cursor-pointer"
        />
        <span className="font-medium">{editorMessages.showTitleLabel}</span>
      </label>

      {page.createdByUsername && (
        <div className="ml-auto">
          {editorMessages.createdBy}{" "}
          <span className="text-[var(--ds-text)]">{page.createdByUsername}</span>
          {page.updatedByUsername && (
            <>
              {" "}
              · {editorMessages.updatedBy}{" "}
              <span className="text-[var(--ds-text)]">{page.updatedByUsername}</span>
            </>
          )}
        </div>
      )}

      {patchError && <span className="text-red-500">{patchError}</span>}
    </div>
  );
}

/**
 * Markdown content editor page for one content slug.
 *
 * @returns Full editor route component.
 */
export function ContentEditorPage() {
  const { messages } = useI18n();
  const common = messages.common;
  const editorMessages = messages.content.editor;
  const { slug = "" } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { data: page, isLoading } = useAdminContentPage(slug);
  const save = useSaveContentPage(slug);
  const patch = usePatchContentPage(slug);
  const deletePage = useDeleteContentPage();

  const [state, dispatch] = useReducer(editorReducer, undefined, createInitialEditorState);

  useEffect(() => {
    void slug;
    dispatch({ type: "resetForSlug" });
  }, [slug]);

  const updateDraftContent = useCallback((markdown: string) => {
    dispatch({ type: "setDraftContent", value: markdown });
    dispatch({ type: "setSaved", value: false });
  }, []);

  const currentContent = state.draftContent ?? page?.content ?? "";

  const handleSave = () => {
    if (!page || currentContent === page.content) return;
    save.mutate(currentContent, {
      onSuccess: () => dispatch({ type: "setSaved", value: true }),
    });
  };

  useKeyboardSave(handleSave);

  useEffect(() => {
    if (!state.saved) return;
    const timer = setTimeout(() => dispatch({ type: "setSaved", value: false }), 2000);
    return () => clearTimeout(timer);
  }, [state.saved]);

  const changeFontSize = (delta: number) => {
    const next = Math.min(FONT_SIZE_MAX, Math.max(FONT_SIZE_MIN, state.sourceFontSize + delta));
    localStorage.setItem(FONT_SIZE_KEY, String(next));
    dispatch({ type: "setSourceFontSize", value: next });
  };

  async function handlePatch(data: {
    title?: string;
    slug?: string;
    status?: string;
    showTitle?: boolean;
  }) {
    dispatch({ type: "setPatchError", value: null });
    try {
      const updated = await patch.mutateAsync(data);
      if (data.slug && data.slug !== slug) {
        navigate(`/pages/${updated.slug}`, { replace: true });
      }
    } catch (err) {
      dispatch({
        type: "setPatchError",
        value: err instanceof Error ? err.message : editorMessages.saveError,
      });
    }
  }

  function handleTitleSave() {
    void handlePatch({ title: state.editTitleValue });
    dispatch({ type: "setEditingTitle", value: false });
  }

  function handleSlugSave() {
    void handlePatch({ slug: state.editSlugValue });
    dispatch({ type: "setEditingSlug", value: false });
  }

  const title = page?.title ?? slug;

  return (
    <PageLayout>
      <PageHeader
        title={title}
        leading={<HeaderBackButton label={messages.content.pages.title} onClick={() => navigate("/pages")} />}
      >
        <EditorHeaderActions
          sourceFontSize={state.sourceFontSize}
          canIncreaseFont={state.sourceFontSize < FONT_SIZE_MAX}
          canDecreaseFont={state.sourceFontSize > FONT_SIZE_MIN}
          confirmDelete={state.confirmDelete}
          isDeleting={deletePage.isPending}
          isSaving={save.isPending}
          saved={state.saved}
          common={common}
          editorMessages={editorMessages}
          onDecreaseFont={() => changeFontSize(-1)}
          onIncreaseFont={() => changeFontSize(+1)}
          onOpenDelete={() => dispatch({ type: "setConfirmDelete", value: true })}
          onCancelDelete={() => dispatch({ type: "setConfirmDelete", value: false })}
          onConfirmDelete={() => {
            deletePage.mutate(slug, {
              onSuccess: () => navigate("/pages"),
            });
          }}
          onSave={handleSave}
          onPreview={() => {
            window.open(`${FRONTEND_URL}/${slug}`, "_blank");
          }}
        />
      </PageHeader>

      {page && (
        <EditorMetadataBar
          page={page}
          patchError={state.patchError}
          editingTitle={state.editingTitle}
          editTitleValue={state.editTitleValue}
          editingSlug={state.editingSlug}
          editSlugValue={state.editSlugValue}
          editorMessages={editorMessages}
          common={common}
          onStartEditTitle={() => {
            dispatch({ type: "setEditTitleValue", value: page.title });
            dispatch({ type: "setEditingTitle", value: true });
          }}
          onTitleValueChange={(value) => dispatch({ type: "setEditTitleValue", value })}
          onSaveTitle={handleTitleSave}
          onCancelTitle={() => dispatch({ type: "setEditingTitle", value: false })}
          onStartEditSlug={() => {
            dispatch({ type: "setEditSlugValue", value: page.slug });
            dispatch({ type: "setEditingSlug", value: true });
          }}
          onSlugValueChange={(value) => dispatch({ type: "setEditSlugValue", value })}
          onSlugBlur={(value) => dispatch({ type: "setEditSlugValue", value: slugify(value) })}
          onSaveSlug={handleSlugSave}
          onCancelSlug={() => dispatch({ type: "setEditingSlug", value: false })}
          onStatusChange={(value) => void handlePatch({ status: value })}
          onShowTitleChange={(value) => void handlePatch({ showTitle: value })}
        />
      )}

      <DashboardSection>
        <DashboardSection.Header
          icon={<MarkdownLogoIcon weight="duotone" className="size-4" />}
          title={title}
        />
        <PageBody
          className="overflow-hidden"
          style={{ "--source-font-size": `${state.sourceFontSize}px` } as React.CSSProperties}
        >
          {isLoading && (
            <div className="flex items-center justify-center h-64 text-[var(--ds-text-subtle)] text-sm">
              {editorMessages.loadingContent}
            </div>
          )}

          {page && (
            <Suspense fallback={<div className="h-64 bg-[var(--ds-input-bg)] animate-pulse" />}>
              <MarkdownEditor
                key={slug}
                value={currentContent}
                onChange={updateDraftContent}
                height="100%"
                className="rounded-none border-none"
              />
            </Suspense>
          )}

          {save.isError && (
            <p className="text-red-500 text-sm text-center mt-4">{editorMessages.saveError}</p>
          )}
        </PageBody>
      </DashboardSection>
    </PageLayout>
  );
}
