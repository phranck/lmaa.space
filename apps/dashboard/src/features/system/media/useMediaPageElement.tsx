import { useEffect, useMemo, useReducer } from "react";
import { useNavigate, useParams } from "react-router";

import type { MediaAsset, MediaFolder, MediaFolderColor } from "@lmaa/shared";
import { FormHelpText } from "@lmaa/ui/form-primitives";

import { AlertDialog } from "@/components/ui/AlertDialog.tsx";
import { PageFooter } from "@/components/ui/PageFooter.tsx";
import { PageBody } from "@/components/ui/PageLayout.tsx";
import { PageLayout } from "@/components/ui/PageLayout.tsx";
import { useI18n } from "@/context/I18nContext.tsx";
import { useAuth } from "@/features/auth/AuthContext.tsx";
import {
  useAdminMedia,
  useDeleteMediaAssets,
  useRenameMedia,
  useSyncMedia,
} from "@/features/system/hooks/useAdminMedia.ts";
import { resolveDashboardMediaUrl } from "@/features/system/media/dashboard-media-url.ts";
import { downloadFilenameForAsset } from "@/features/system/media/media-download.ts";
import { MEDIA_ROOT_PATH, mediaFolderPath } from "@/features/system/media/media-routes.ts";
import { getHlsMarkdownEmbed } from "@/features/system/media/media-utils.ts";
import { MediaAssetBrowser } from "@/features/system/media/MediaAssetBrowser.tsx";
import { MediaContextMenu } from "@/features/system/media/MediaContextMenu.tsx";
import { MediaDeleteDialog } from "@/features/system/media/MediaDeleteDialog.tsx";
import { MediaFolderCreateDialog } from "@/features/system/media/MediaFolderCreateDialog.tsx";
import { MediaFolderDeleteDialog } from "@/features/system/media/MediaFolderDeleteDialog.tsx";
import { MediaFolderRenameDialog } from "@/features/system/media/MediaFolderRenameDialog.tsx";
import type { MediaLinkedContentUsage } from "@/features/system/media/MediaLinkedContentSection.tsx";
import { MediaPageHeader } from "@/features/system/media/MediaPageHeader.tsx";
import { MediaUploadConflictDialog } from "@/features/system/media/MediaUploadConflictDialog.tsx";
import { MediaUploadOverlay } from "@/features/system/media/MediaUploadOverlay.tsx";
import { TileSizeSlider } from "@/features/system/media/TileSizeSlider.tsx";
import { useFolderContents } from "@/features/system/media/useFolderContents.ts";
import { useMediaContextMenu } from "@/features/system/media/useMediaContextMenu.ts";
import { useMediaDropZone } from "@/features/system/media/useMediaDropZone.ts";
import { useMediaFilePicker } from "@/features/system/media/useMediaFilePicker.tsx";
import { useMediaFolderMutations } from "@/features/system/media/useMediaFolderMutations.ts";
import {
  type SelectionAnchor,
  type SelectionBox,
  useMediaSelection,
} from "@/features/system/media/useMediaSelection.ts";
import { useMediaUploadWorkflow } from "@/features/system/media/useMediaUploadWorkflow.ts";
import { useTileSize } from "@/lib/hooks/useTileSize.ts";

interface MediaPageState {
  selectedAssetIds: number[];
  selectedFolderIds: number[];
  selectionAnchorId: SelectionAnchor | null;
  draft: { name: string; alias: string };
  actionError: string | null;
  copied: "url" | "markdown" | null;
  deleteTargets: { assets: MediaAsset[]; folders: MediaFolder[] } | null;
  folderCreateOpen: { selectionAssetIds: number[] } | null;
  folderRenameTarget: MediaFolder | null;
  folderDeleteTarget: { folder: MediaFolder; itemCount: number } | null;
  isDragActive: boolean;
  selectionBox: SelectionBox | null;
  notFoundShown: boolean;
  folderContentsErrorDismissedKey: string | null;
}

type MediaPageAction = Partial<MediaPageState>;

const EMPTY_LINKED_CONTENT_USAGES: MediaLinkedContentUsage[] = [];
const EMPTY_MEDIA_ANCESTORS: MediaFolder[] = [];
const EMPTY_MEDIA_ASSETS: MediaAsset[] = [];
const EMPTY_MEDIA_FOLDERS: MediaFolder[] = [];

function mediaPageReducer(state: MediaPageState, action: MediaPageAction): MediaPageState {
  return { ...state, ...action };
}

/**
 * Controller hook for the media asset manager page.
 *
 * Reads the optional `folderId` route param to determine the active folder.
 * Wires `useFolderContents`, `useMediaFolderMutations`, and all existing asset
 * hooks together. Handles folder navigation, creation, renaming, deletion, and
 * mixed asset+folder delete targets. Delegates selection logic to
 * `useMediaSelection` and context-menu state to `useMediaContextMenu`.
 */
export function useMediaPageElement() {
  const { locale, messages } = useI18n();
  const { user } = useAuth();
  const canSyncMedia = user?.role !== "moderator";
  const mediaMessages = messages.media;
  const common = messages.common;
  const { tileSize, setTileSize, showText, gridStyle, bounds } = useTileSize({
    storageKey: "dashboard.assetManager.tileSize",
  });

  const params = useParams<{ folderId?: string }>();
  const navigate = useNavigate();
  const currentFolderId = (() => {
    if (!params.folderId) return null;
    const parsed = Number.parseInt(params.folderId, 10);
    return Number.isFinite(parsed) ? parsed : null;
  })();

  const [state, dispatch] = useReducer(mediaPageReducer, {
    selectedAssetIds: [],
    selectedFolderIds: [],
    selectionAnchorId: null,
    draft: { name: "", alias: "" },
    actionError: null,
    copied: null,
    deleteTargets: null,
    folderCreateOpen: null,
    folderRenameTarget: null,
    folderDeleteTarget: null,
    isDragActive: false,
    selectionBox: null,
    notFoundShown: false,
    folderContentsErrorDismissedKey: null,
  });
  const {
    selectedAssetIds,
    selectedFolderIds,
    selectionAnchorId,
    draft,
    actionError,
    copied,
    deleteTargets,
    folderCreateOpen,
    folderRenameTarget,
    folderDeleteTarget,
    isDragActive,
    selectionBox,
    notFoundShown,
    folderContentsErrorDismissedKey,
  } = state;

  const {
    data: folderContents,
    error: folderContentsError,
    isError: isFolderContentsError,
    isFetched,
    isLoading,
  } = useFolderContents(currentFolderId);
  const folder = folderContents?.folder ?? null;
  const ancestors = folderContents?.ancestors ?? EMPTY_MEDIA_ANCESTORS;
  const folders = folderContents?.folders ?? EMPTY_MEDIA_FOLDERS;
  const assets = folderContents?.assets ?? EMPTY_MEDIA_ASSETS;
  const folderContentsErrorMessage =
    folderContentsError instanceof Error ? folderContentsError.message : common.unknownError;
  const folderContentsErrorKey = isFolderContentsError
    ? `${currentFolderId ?? "root"}:${folderContentsErrorMessage}`
    : null;
  const showFolderContentsError =
    folderContentsErrorKey !== null && folderContentsErrorKey !== folderContentsErrorDismissedKey;

  const folderMutations = useMediaFolderMutations();

  const { data: allMediaAssets = [] } = useAdminMedia();
  const renameMedia = useRenameMedia();
  const deleteMedia = useDeleteMediaAssets();
  const syncMedia = useSyncMedia();

  const selectedAssetIdSet = useMemo(() => new Set(selectedAssetIds), [selectedAssetIds]);
  const selectedFolderIdSet = useMemo(() => new Set(selectedFolderIds), [selectedFolderIds]);
  const selectedAssets = assets.filter((a) => selectedAssetIdSet.has(a.id));
  const selectedFolders = folders.filter((f) => selectedFolderIdSet.has(f.id));
  const selectedAsset =
    selectedAssets.length === 1 && selectedFolders.length === 0 ? selectedAssets[0] : null;
  const selectedFolder =
    selectedFolders.length === 1 && selectedAssets.length === 0 ? selectedFolders[0] : null;
  const folderItemCounts = useMemo(
    () => new Map(folders.map((folder) => [folder.id, folder.itemCount])),
    [folders],
  );

  const linkedContentUsages = selectedAsset
    ? EMPTY_LINKED_CONTENT_USAGES
    : EMPTY_LINKED_CONTENT_USAGES;

  const {
    canUploadWithNewName,
    handleUpload,
    handleUploadBundles,
    handleUploadConflictApplyToAllChange,
    handleUploadConflictCancel,
    handleUploadConflictDraftNameChange,
    handleUploadConflictOverwrite,
    handleUploadConflictRename,
    handleUploadProgressChange,
    isUploading,
    uploadConflict,
    uploadConflictDraftConflict,
    uploadConflictDraftName,
    uploadOverlayDetail,
    uploadOverlayTitle,
    uploadProgress,
    uploadProgressValue,
    uploadConflictApplyToAll,
    uploadConflictShowApplyToAll,
  } = useMediaUploadWorkflow({
    assets: allMediaAssets,
    locale,
    mediaMessages,
    onActionError: (message) => dispatch({ actionError: message }),
    onUploadedAssetSelect: (asset) =>
      dispatch({
        selectedAssetIds: [asset.id],
        selectedFolderIds: [],
        selectionAnchorId: { kind: "asset", id: asset.id },
      }),
    targetFolderId: currentFolderId,
  });

  const { handleDragEnter, handleDragLeave, handleDragOver, handleDrop } = useMediaDropZone({
    mediaMessages,
    onActionError: (message) => dispatch({ actionError: message }),
    onDragActiveChange: (active) => dispatch({ isDragActive: active }),
    onUploadBundles: handleUploadBundles,
    onUploadDirectory: async (directory) => {
      const folder = await folderMutations.createFolder.mutateAsync({
        name: directory.name,
        parentId: currentFolderId,
      });
      const result = await handleUpload(directory.files, {
        targetFolderId: folder.id,
        selectLastAsset: false,
      });
      if (!result.ok) return;
      navigate(mediaFolderPath(folder.id));
    },
    onUploadFiles: handleUpload,
    onUploadProgressChange: handleUploadProgressChange,
  });

  const { open: openFilePicker, hiddenInput: filePickerInput } = useMediaFilePicker({
    onFiles: (files) => void handleUpload(files),
  });

  // ── Navigation helpers ────────────────────────────────────────────────────

  function handleNavigateUp() {
    if (ancestors.length === 0) {
      navigate(MEDIA_ROOT_PATH);
      return;
    }
    const parent = ancestors[ancestors.length - 1];
    navigate(mediaFolderPath(parent.id));
  }

  function handleOpenFolder(folderId: number) {
    navigate(mediaFolderPath(folderId));
  }

  // ── Selection hooks ───────────────────────────────────────────────────────

  const {
    handleMediaAreaClick,
    handleSelectItem,
    handleSelectionAreaKeyDown,
    handleSelectionMouseDown,
    selectionAreaRef,
  } = useMediaSelection({
    assets,
    folders,
    deleteDialogOpen:
      deleteTargets !== null || folderRenameTarget !== null || folderDeleteTarget !== null,
    selectedAssetIds,
    selectedFolderIds,
    selectedAssetIdSet,
    selectedFolderIdSet,
    selectionAnchorId,
    updateSelectionState: dispatch,
    ancestorsExist: ancestors.length > 0 || currentFolderId !== null,
    onNavigateUp: handleNavigateUp,
  });

  const contextMenu = useMediaContextMenu({
    selectedAssetIds,
    selectedFolderIds,
    setSelectionToAsset: (id) =>
      dispatch({
        selectedAssetIds: [id],
        selectedFolderIds: [],
        selectionAnchorId: { kind: "asset", id },
      }),
    setSelectionToFolder: (id) =>
      dispatch({
        selectedAssetIds: [],
        selectedFolderIds: [id],
        selectionAnchorId: { kind: "folder", id },
      }),
    clearSelection: () =>
      dispatch({ selectedAssetIds: [], selectedFolderIds: [], selectionAnchorId: null }),
  });

  // ── Effects ───────────────────────────────────────────────────────────────

  // Clear selection when navigating to a different folder.
  useEffect(() => {
    dispatch({
      selectedAssetIds: [],
      selectedFolderIds: [],
      selectionAnchorId: null,
      notFoundShown: false,
      folderContentsErrorDismissedKey: null,
    });
  }, [currentFolderId]);

  // Redirect when the current folder is not found.
  useEffect(() => {
    if (currentFolderId === null || !isFetched) return;
    if (folder === null && !notFoundShown) {
      dispatch({ actionError: mediaMessages.folders.notFound, notFoundShown: true });
      navigate(MEDIA_ROOT_PATH, { replace: true });
    }
  }, [currentFolderId, isFetched, folder, notFoundShown, mediaMessages.folders.notFound, navigate]);

  // Prune stale selection IDs after data refresh.
  useEffect(() => {
    if (!isFetched) return;

    if (assets.length === 0 && folders.length === 0) {
      if (
        selectedAssetIds.length > 0 ||
        selectedFolderIds.length > 0 ||
        selectionAnchorId !== null
      ) {
        dispatch({ selectedAssetIds: [], selectedFolderIds: [], selectionAnchorId: null });
      }
      return;
    }

    const existingAssetIds = new Set(assets.map((a) => a.id));
    const existingFolderIds = new Set(folders.map((f) => f.id));
    const nextAssetIds = selectedAssetIds.filter((id) => existingAssetIds.has(id));
    const nextFolderIds = selectedFolderIds.filter((id) => existingFolderIds.has(id));

    if (
      nextAssetIds.length !== selectedAssetIds.length ||
      nextFolderIds.length !== selectedFolderIds.length
    ) {
      dispatch({
        selectedAssetIds: nextAssetIds,
        selectedFolderIds: nextFolderIds,
        selectionAnchorId:
          selectionAnchorId &&
          (selectionAnchorId.kind === "asset"
            ? existingAssetIds.has(selectionAnchorId.id)
            : existingFolderIds.has(selectionAnchorId.id))
            ? selectionAnchorId
            : nextAssetIds.length > 0
              ? { kind: "asset", id: nextAssetIds[nextAssetIds.length - 1] }
              : nextFolderIds.length > 0
                ? { kind: "folder", id: nextFolderIds[nextFolderIds.length - 1] }
                : null,
      });
    }
  }, [
    assets,
    dispatch,
    folders,
    isFetched,
    selectedAssetIds,
    selectedFolderIds,
    selectionAnchorId,
  ]);

  // Reset draft + copied state when selected asset changes.
  useEffect(() => {
    dispatch({
      draft: {
        name: selectedAsset?.displayName ?? "",
        alias: selectedAsset?.alias ?? "",
      },
    });
    dispatch({ copied: null });
  }, [selectedAsset]);

  // Auto-clear the copied indicator after 1.5 s.
  useEffect(() => {
    if (!copied) return;
    const timer = window.setTimeout(() => dispatch({ copied: null }), 1500);
    return () => window.clearTimeout(timer);
  }, [copied]);

  // Global Escape clears selection when no dialog is open.
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key !== "Escape" || deleteTargets) return;
      dispatch({ selectedAssetIds: [], selectedFolderIds: [], selectionAnchorId: null });
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [deleteTargets]);

  // ── Asset action handlers ─────────────────────────────────────────────────

  async function handleCopyUrl() {
    if (!selectedAsset) return;
    await navigator.clipboard.writeText(selectedAsset.url);
    dispatch({ copied: "url" });
  }

  async function handleCopyAddress() {
    if (!selectedAsset) return;
    await navigator.clipboard.writeText(resolveDashboardMediaUrl(selectedAsset.url));
    dispatch({ copied: "url" });
  }

  async function handleCopyMarkdownEmbed() {
    if (!selectedAsset) return;
    await navigator.clipboard.writeText(getHlsMarkdownEmbed(selectedAsset));
    dispatch({ copied: "markdown" });
  }

  function handleOpenInNewTab() {
    if (!selectedAsset) return;
    window.open(resolveDashboardMediaUrl(selectedAsset.url), "_blank", "noopener,noreferrer");
  }

  function handleOpenInNewWindow() {
    if (!selectedAsset) return;
    window.open(
      resolveDashboardMediaUrl(selectedAsset.url),
      `media-asset-${selectedAsset.id}`,
      "noopener,noreferrer,popup",
    );
  }

  function handleSaveToDownloads() {
    if (!selectedAsset) return;
    const link = document.createElement("a");
    link.href = resolveDashboardMediaUrl(selectedAsset.url);
    link.download = downloadFilenameForAsset(selectedAsset);
    link.rel = "noopener";
    document.body.appendChild(link);
    link.click();
    link.remove();
  }

  async function handleSaveAs() {
    if (!selectedAsset) return;
    if (!("showSaveFilePicker" in window)) return;
    try {
      const response = await fetch(resolveDashboardMediaUrl(selectedAsset.url));
      const blob = await response.blob();
      const handle = await (
        window as typeof window & {
          showSaveFilePicker: (options: { suggestedName: string }) => Promise<FileSystemFileHandle>;
        }
      ).showSaveFilePicker({ suggestedName: downloadFilenameForAsset(selectedAsset) });
      const writable = await handle.createWritable();
      await writable.write(blob);
      await writable.close();
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      dispatch({
        actionError: error instanceof Error ? error.message : common.unknownError,
      });
    }
  }

  async function handleCopyAsset() {
    if (!selectedAsset || selectedAsset.kind !== "image") return;
    try {
      const response = await fetch(resolveDashboardMediaUrl(selectedAsset.url));
      const blob = await response.blob();
      await navigator.clipboard.write([new ClipboardItem({ [blob.type]: blob })]);
    } catch (error) {
      dispatch({
        actionError: error instanceof Error ? error.message : common.unknownError,
      });
    }
  }

  function focusSelectedAssetField(field: "alias" | "display-name") {
    if (!selectedAsset) return;
    requestAnimationFrame(() => {
      const input = document.getElementById(`media-asset-${field}-${selectedAsset.id}`);
      if (input instanceof HTMLInputElement) {
        input.focus();
        input.select();
      }
    });
  }

  function handleRenameAlias() {
    focusSelectedAssetField("alias");
  }

  function handleRenameDisplayName() {
    focusSelectedAssetField("display-name");
  }

  async function handleSaveMeta() {
    if (!selectedAsset) return;

    const nextAlias = draft.alias.trim() || null;
    const nextName = draft.name.trim();
    if (nextName.length === 0) return;

    const aliasChanged = nextAlias !== (selectedAsset.alias ?? null);
    const nameChanged = nextName !== selectedAsset.displayName;
    if (!aliasChanged && !nameChanged) return;

    dispatch({ actionError: null });

    try {
      await renameMedia.mutateAsync({
        id: selectedAsset.id,
        displayName: nextName,
        alias: nextAlias,
      });
    } catch (error) {
      dispatch({ actionError: error instanceof Error ? error.message : mediaMessages.renameError });
    }
  }

  // ── Delete handlers ───────────────────────────────────────────────────────

  /**
   * Handles the mixed-target delete confirmation. Deletes folders first
   * (cascade includes their assets) then deletes any standalone assets.
   */
  async function handleConfirmDelete() {
    if (!deleteTargets) return;
    dispatch({ actionError: null });
    try {
      if (deleteTargets.folders.length > 0) {
        await Promise.all(
          deleteTargets.folders.map((folder) =>
            folderMutations.deleteFolder.mutateAsync(folder.id),
          ),
        );
      }
      if (deleteTargets.assets.length > 0) {
        const ids = deleteTargets.assets.map((a) => a.id);
        await deleteMedia.mutateAsync(ids);
      }
      dispatch({
        deleteTargets: null,
        selectedAssetIds: selectedAssetIds.filter(
          (id) => !deleteTargets.assets.some((a) => a.id === id),
        ),
        selectedFolderIds: selectedFolderIds.filter(
          (id) => !deleteTargets.folders.some((f) => f.id === id),
        ),
        selectionAnchorId: null,
      });
    } catch (error) {
      dispatch({
        actionError: error instanceof Error ? error.message : common.unknownError,
      });
    }
  }

  /** Opens the mixed-selection delete dialog for the current selection. */
  function handleDeleteMixedSelection() {
    if (selectedAssets.length === 0 && selectedFolders.length === 0) return;
    dispatch({ deleteTargets: { assets: selectedAssets, folders: selectedFolders } });
  }

  // ── Folder action handlers ────────────────────────────────────────────────

  function handleNewFolder() {
    dispatch({ folderCreateOpen: { selectionAssetIds: [] } });
  }

  function handleNewFolderWithSelection() {
    dispatch({ folderCreateOpen: { selectionAssetIds: [...selectedAssetIds] } });
  }

  async function handleConfirmCreateFolder(name: string) {
    const ctx = folderCreateOpen;
    if (!ctx) return;
    dispatch({ actionError: null });
    try {
      await folderMutations.createFolder.mutateAsync({
        name,
        parentId: currentFolderId,
        assetIds: ctx.selectionAssetIds.length > 0 ? ctx.selectionAssetIds : undefined,
      });
      dispatch({ folderCreateOpen: null });
    } catch (error) {
      dispatch({
        actionError: error instanceof Error ? error.message : common.unknownError,
      });
    }
  }

  function handleStartRenameFolder() {
    if (selectedFolder) dispatch({ folderRenameTarget: selectedFolder });
  }

  async function handleConfirmRenameFolder(folderId: number, name: string) {
    dispatch({ actionError: null });
    try {
      await folderMutations.renameFolder.mutateAsync({ id: folderId, name });
      dispatch({ folderRenameTarget: null });
    } catch (error) {
      dispatch({
        actionError: error instanceof Error ? error.message : common.unknownError,
      });
    }
  }

  async function handleSetFolderColor(folderId: number, color: MediaFolderColor | null) {
    dispatch({ actionError: null });
    try {
      await folderMutations.setFolderColor.mutateAsync({ id: folderId, color });
    } catch (error) {
      dispatch({
        actionError: error instanceof Error ? error.message : common.unknownError,
      });
    }
  }

  function handleRequestDeleteFolder(target: MediaFolder, itemCount: number) {
    dispatch({ folderDeleteTarget: { folder: target, itemCount } });
  }

  async function handleConfirmDeleteFolder(folderId: number) {
    const navigateAfter = currentFolderId === folderId;
    dispatch({ actionError: null });
    try {
      await folderMutations.deleteFolder.mutateAsync(folderId);
      dispatch({ folderDeleteTarget: null });
      if (navigateAfter) {
        if (ancestors.length === 0) navigate(MEDIA_ROOT_PATH);
        else navigate(mediaFolderPath(ancestors[ancestors.length - 1].id));
      }
    } catch (error) {
      dispatch({
        actionError: error instanceof Error ? error.message : common.unknownError,
      });
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────

  const showUploadOverlay = isDragActive || uploadProgress !== null;

  return (
    <PageLayout>
      <MediaPageHeader
        ancestors={ancestors}
        canSync={canSyncMedia}
        currentFolder={folder}
        isSyncing={syncMedia.isPending}
        isUploading={isUploading}
        mediaMessages={mediaMessages}
        onSync={() => syncMedia.mutate()}
        onUploadFiles={(files) => void handleUpload(files)}
      />

      <PageBody
        className="relative"
        onDragEnter={handleDragEnter}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <MediaAssetBrowser
          assets={assets}
          common={common}
          copied={copied}
          currentFolderId={currentFolderId}
          draft={draft}
          folders={folders}
          folderItemCounts={folderItemCounts}
          gridStyle={gridStyle}
          status={{
            deleting: deleteMedia.isPending || folderMutations.deleteFolder.isPending,
            loading: isLoading,
            renaming: renameMedia.isPending,
            showTileText: showText,
          }}
          linkedContentUsages={linkedContentUsages}
          locale={locale}
          mediaMessages={mediaMessages}
          onAreaClick={handleMediaAreaClick}
          onAreaContextMenu={contextMenu.openForEmpty}
          onAreaKeyDown={handleSelectionAreaKeyDown}
          onAreaMouseDown={handleSelectionMouseDown}
          onCopyMarkdownEmbed={() => void handleCopyMarkdownEmbed()}
          onCopyUrl={() => void handleCopyUrl()}
          onDeleteFolder={() => {
            if (selectedFolder) handleRequestDeleteFolder(selectedFolder, selectedFolder.itemCount);
          }}
          onDeleteMixedSelection={handleDeleteMixedSelection}
          onDeleteSingle={() => {
            if (selectedAsset)
              dispatch({ deleteTargets: { assets: [selectedAsset], folders: [] } });
          }}
          onDraftChange={(updated) => dispatch({ draft: updated })}
          onFolderContextMenu={contextMenu.openForFolder}
          onItemContextMenu={contextMenu.openForAsset}
          onOpenFolder={handleOpenFolder}
          onRenameFolder={handleStartRenameFolder}
          onSaveMeta={() => void handleSaveMeta()}
          onSetFolderColor={(folderId, color) => void handleSetFolderColor(folderId, color)}
          onSelectItem={handleSelectItem}
          selectedAssetIdSet={selectedAssetIdSet}
          selectedAssets={selectedAssets}
          selectedFolderIdSet={selectedFolderIdSet}
          selectedFolders={selectedFolders}
          selectionAreaRef={selectionAreaRef}
          selectionBox={selectionBox}
        />

        <MediaUploadOverlay
          detail={uploadOverlayDetail}
          show={showUploadOverlay}
          title={uploadOverlayTitle}
          uploadProgress={uploadProgress}
          uploadProgressValue={uploadProgressValue}
        />
      </PageBody>

      <PageFooter>
        <TileSizeSlider
          value={tileSize}
          onChange={setTileSize}
          label={mediaMessages.tileSize}
          min={bounds.min}
          max={bounds.max}
          className="mr-auto pr-4"
        />
        <FormHelpText>{mediaMessages.uploadHint}</FormHelpText>
      </PageFooter>

      <MediaUploadConflictDialog
        applyToAll={uploadConflictApplyToAll}
        canRename={canUploadWithNewName}
        common={common}
        conflict={uploadConflict}
        draftConflict={uploadConflictDraftConflict}
        draftName={uploadConflictDraftName}
        mediaMessages={mediaMessages}
        onApplyToAllChange={handleUploadConflictApplyToAllChange}
        onCancel={handleUploadConflictCancel}
        onDraftNameChange={handleUploadConflictDraftNameChange}
        onOverwrite={handleUploadConflictOverwrite}
        onRename={handleUploadConflictRename}
        showApplyToAll={uploadConflictShowApplyToAll}
      />

      <MediaDeleteDialog
        common={common}
        isDeleting={deleteMedia.isPending}
        mediaMessages={mediaMessages}
        onClose={() => dispatch({ deleteTargets: null })}
        onConfirm={() => void handleConfirmDelete()}
        targets={deleteTargets}
      />

      <MediaFolderCreateDialog
        open={folderCreateOpen !== null}
        selectedAssetCount={folderCreateOpen?.selectionAssetIds.length ?? 0}
        onCancel={() => dispatch({ folderCreateOpen: null })}
        onSubmit={(name) => void handleConfirmCreateFolder(name)}
        busy={folderMutations.createFolder.isPending}
      />

      <MediaFolderRenameDialog
        open={folderRenameTarget !== null}
        folder={folderRenameTarget}
        onCancel={() => dispatch({ folderRenameTarget: null })}
        onSubmit={(folderId, name) => void handleConfirmRenameFolder(folderId, name)}
        busy={folderMutations.renameFolder.isPending}
      />

      <MediaFolderDeleteDialog
        target={folderDeleteTarget}
        busy={folderMutations.deleteFolder.isPending}
        onClose={() => dispatch({ folderDeleteTarget: null })}
        onConfirm={(folderId) => void handleConfirmDeleteFolder(folderId)}
      />

      {filePickerInput}

      <MediaContextMenu
        open={contextMenu.state.open}
        origin={contextMenu.state.origin}
        onClose={contextMenu.close}
        variant={contextMenu.state.variant}
        asset={contextMenu.state.variant === "single" ? selectedAsset : null}
        folder={contextMenu.state.variant === "folder" ? selectedFolder : null}
        selectedAssetCount={selectedAssets.length}
        selectedFolderCount={selectedFolders.length}
        folderItemCount={
          contextMenu.state.variant === "folder" && selectedFolder ? selectedFolder.itemCount : 0
        }
        mediaMessages={mediaMessages}
        onOpenInNewTab={handleOpenInNewTab}
        onOpenInNewWindow={handleOpenInNewWindow}
        onSaveToDownloads={handleSaveToDownloads}
        onSaveAs={() => void handleSaveAs()}
        onCopyAddress={() => void handleCopyAddress()}
        onCopyAsset={() => void handleCopyAsset()}
        onRenameAlias={handleRenameAlias}
        onRenameDisplayName={handleRenameDisplayName}
        onDeleteAsset={() => {
          if (selectedAsset) dispatch({ deleteTargets: { assets: [selectedAsset], folders: [] } });
        }}
        onDeleteSelection={handleDeleteMixedSelection}
        onAddAssets={openFilePicker}
        onNewFolder={handleNewFolder}
        onNewFolderWithSelection={handleNewFolderWithSelection}
        onOpenFolder={() => selectedFolder && handleOpenFolder(selectedFolder.id)}
        onRenameFolder={handleStartRenameFolder}
        onSetFolderColor={(color) =>
          selectedFolder && void handleSetFolderColor(selectedFolder.id, color)
        }
        onDeleteFolder={() => {
          if (selectedFolder) handleRequestDeleteFolder(selectedFolder, selectedFolder.itemCount);
        }}
      />
      <AlertDialog
        open={actionError !== null}
        title={mediaMessages.uploadError}
        variant="error"
        onClose={() => dispatch({ actionError: null })}
      >
        {actionError}
      </AlertDialog>
      <AlertDialog
        open={showFolderContentsError}
        title={mediaMessages.loadError}
        variant="error"
        onClose={() => dispatch({ folderContentsErrorDismissedKey: folderContentsErrorKey })}
      >
        {folderContentsErrorMessage}
      </AlertDialog>
    </PageLayout>
  );
}
