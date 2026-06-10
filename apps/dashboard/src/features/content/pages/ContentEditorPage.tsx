import { EyeIcon, MarkdownLogoIcon, MinusCircleIcon, PlusCircleIcon } from "@phosphor-icons/react";
import { Suspense, lazy, useCallback, useEffect, useMemo, useReducer } from "react";
import { useNavigate, useParams } from "react-router";

import type { ContentPage, ContentWidth } from "@lmaa/shared";
import { DashboardSection } from "@lmaa/ui/dashboard-section";

const MarkdownEditor = lazy(() =>
  import("@lmaa/ui/markdown-editor").then((m) => ({ default: m.MarkdownEditor })),
);

import {
  CancelActionButton,
  DeleteActionButton,
  SaveActionButton,
} from "@/components/ui/DashboardActionButton.tsx";
import { DashboardButton, DashboardIconButton } from "@/components/ui/DashboardButton.tsx";
import {
  DashboardCheckboxField,
  DashboardCombobox,
  DashboardInput,
} from "@/components/ui/DashboardControls.tsx";
import { HeaderBackButton } from "@/components/ui/HeaderBackButton.tsx";
import { PageHeader } from "@/components/ui/PageHeader.tsx";
import { PageBody, PageLayout } from "@/components/ui/PageLayout.tsx";
import { useI18n } from "@/context/I18nContext.tsx";
import {
  useAdminContentPage,
  useCreateContentPreviewSession,
  useDeleteContentPage,
  usePatchContentPage,
  useSaveContentPage,
} from "@/features/content/hooks/useAdminContent.ts";
import { FRONTEND_URL } from "@/lib/env.ts";

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
  fontControls: {
    sourceFontSize: number;
    canIncrease: boolean;
    canDecrease: boolean;
  };
  deleteState: {
    confirming: boolean;
    isDeleting: boolean;
  };
  saveState: {
    isSaving: boolean;
    saved: boolean;
  };
  common: {
    cancel: string;
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
  isPreviewPending?: boolean;
}

function EditorHeaderActions({
  fontControls,
  deleteState,
  saveState,
  common,
  editorMessages,
  onDecreaseFont,
  onIncreaseFont,
  onOpenDelete,
  onCancelDelete,
  onConfirmDelete,
  onSave,
  onPreview,
  isPreviewPending = false,
}: EditorHeaderActionsProps) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex items-center gap-1 border border-[var(--ds-border)] rounded-control px-2 py-1.5 text-[var(--ds-text-muted)]">
        <span className="text-xs font-medium mr-1 select-none">Aa</span>
        <DashboardIconButton
          onClick={onDecreaseFont}
          disabled={!fontControls.canDecrease}
          className="size-5"
          size="action"
          title={editorMessages.decreaseFontSize}
          aria-label={editorMessages.decreaseFontSize}
          variant="ghost"
        >
          <MinusCircleIcon weight="duotone" className="size-3.5" />
        </DashboardIconButton>
        <span className="w-8 text-center text-xs tabular-nums select-none">
          {fontControls.sourceFontSize}px
        </span>
        <DashboardIconButton
          onClick={onIncreaseFont}
          disabled={!fontControls.canIncrease}
          className="size-5"
          size="action"
          title={editorMessages.increaseFontSize}
          aria-label={editorMessages.increaseFontSize}
          variant="ghost"
        >
          <PlusCircleIcon weight="duotone" className="size-3.5" />
        </DashboardIconButton>
      </div>

      <DashboardButton
        onClick={onPreview}
        disabled={isPreviewPending}
        leadingIcon={<EyeIcon weight="duotone" className="size-3.5" />}
        size="control"
        variant="neutral"
      >
        {editorMessages.preview}
      </DashboardButton>

      <SaveActionButton
        onClick={onSave}
        disabled={saveState.isSaving}
        busy={saveState.isSaving}
        label={saveState.saved ? editorMessages.saved : undefined}
        size="control"
      />

      {!deleteState.confirming ? (
        <DeleteActionButton
          onClick={onOpenDelete}
          title={editorMessages.deletePage}
          label={editorMessages.deletePage}
          iconOnly
          size="control"
        />
      ) : (
        <div className="flex min-h-8 items-center gap-2 rounded-control border border-[var(--ds-danger-border)] bg-[var(--ds-danger-bg)] px-2 py-1">
          <span className="text-xs font-medium text-[var(--ds-danger-text)]">
            {editorMessages.confirmDelete}
          </span>
          <DeleteActionButton
            onClick={onConfirmDelete}
            disabled={deleteState.isDeleting}
            label={editorMessages.confirmDeleteAction}
          />
          <CancelActionButton onClick={onCancelDelete} label={common.cancel} />
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
    contentWidthLabel: string;
    contentWidthDefault: string;
    contentWidthWide: string;
    contentWidthFull: string;
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
  onContentWidthChange: (value: ContentWidth) => void;
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
  onContentWidthChange,
  onShowTitleChange,
}: EditorMetadataBarProps) {
  return (
    <div className="border-b border-[var(--ds-border)] px-6 py-3 flex flex-wrap items-center gap-6 text-xs text-[var(--ds-text-muted)] bg-[var(--ds-surface)]">
      <div className="flex items-center gap-2">
        <span className="font-medium">{editorMessages.titleLabel}:</span>
        {editingTitle ? (
          <div className="flex items-center gap-1">
            <DashboardInput
              type="text"
              value={editTitleValue}
              onChange={(e) => onTitleValueChange(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") onSaveTitle();
              }}
              className="w-48 text-xs"
            />
            <SaveActionButton
              onClick={onSaveTitle}
              className="px-2"
              label={editorMessages.ok}
              variant="ghost"
            />
            <DashboardButton onClick={onCancelTitle} className="px-2" variant="ghost">
              {common.cancel}
            </DashboardButton>
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
            <DashboardInput
              type="text"
              value={editSlugValue}
              onChange={(e) => onSlugValueChange(e.target.value)}
              onBlur={(e) => onSlugBlur(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") onSaveSlug();
              }}
              pattern="[a-z0-9-]+"
              className="w-40 font-mono text-xs"
            />
            <SaveActionButton
              onClick={onSaveSlug}
              className="px-2"
              label={editorMessages.ok}
              variant="ghost"
            />
            <DashboardButton onClick={onCancelSlug} className="px-2" variant="ghost">
              {common.cancel}
            </DashboardButton>
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
          minWidthFromOptions
          options={[
            { value: "draft", label: editorMessages.statusDraft },
            { value: "published", label: editorMessages.statusPublished },
            { value: "hidden", label: editorMessages.statusHidden },
          ]}
        />
      </div>

      <div className="flex items-center gap-2">
        <span className="font-medium">{editorMessages.contentWidthLabel}:</span>
        <DashboardCombobox
          value={page.contentWidth}
          onValueChange={(value) => onContentWidthChange(value as ContentWidth)}
          minWidthFromOptions
          options={[
            { value: "default", label: editorMessages.contentWidthDefault },
            { value: "wide", label: editorMessages.contentWidthWide },
            { value: "full", label: editorMessages.contentWidthFull },
          ]}
        />
      </div>

      <DashboardCheckboxField
        checked={page.showTitle}
        onCheckedChange={onShowTitleChange}
        label={
          <span className="text-xs font-medium text-[var(--ds-text-muted)]">
            {editorMessages.showTitleLabel}
          </span>
        }
        className="items-center gap-1.5"
        boxClassName="mt-0"
      />

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
  const { createPreviewSession, isPending: isPreviewPending } =
    useCreateContentPreviewSession(slug);
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
    contentWidth?: ContentWidth;
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

  function handlePreview() {
    if (!page) return;
    void createPreviewSession({
      slug: page.slug,
      title: page.title,
      content: currentContent,
      showTitle: page.showTitle,
      contentWidth: page.contentWidth,
    })
      .then(({ token }) => {
        window.open(
          `${FRONTEND_URL}/preview/content?token=${token}`,
          "_blank",
          "noopener,noreferrer",
        );
      })
      .catch((err) => {
        dispatch({
          type: "setPatchError",
          value: err instanceof Error ? err.message : editorMessages.saveError,
        });
      });
  }

  const title = page?.title ?? slug;
  const headerBackButton = useMemo(
    () => (
      <HeaderBackButton label={messages.content.pages.title} onClick={() => navigate("/pages")} />
    ),
    [messages.content.pages.title, navigate],
  );

  return (
    <PageLayout>
      <PageHeader title={title} leading={headerBackButton}>
        <EditorHeaderActions
          fontControls={{
            sourceFontSize: state.sourceFontSize,
            canIncrease: state.sourceFontSize < FONT_SIZE_MAX,
            canDecrease: state.sourceFontSize > FONT_SIZE_MIN,
          }}
          deleteState={{
            confirming: state.confirmDelete,
            isDeleting: deletePage.isPending,
          }}
          saveState={{
            isSaving: save.isPending,
            saved: state.saved,
          }}
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
          onPreview={handlePreview}
          isPreviewPending={isPreviewPending}
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
          onContentWidthChange={(value) => void handlePatch({ contentWidth: value })}
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
