import { useEffect, useMemo, useReducer, useState } from "react";

import type { MediaAsset } from "@lmaa/shared";

import { PageFooter } from "@/components/ui/PageFooter.tsx";
import { PageBody, PageLayout } from "@/components/ui/PageLayout.tsx";
import { useI18n } from "@/context/I18nContext.tsx";
import { useAuth } from "@/features/auth/AuthContext.tsx";
import {
  useAdminMedia,
  useDeleteMediaAssets,
  useRenameMedia,
  useSyncMedia,
} from "@/features/system/hooks/useAdminMedia.ts";
import { getHlsMarkdownEmbed } from "@/features/system/media/media-utils.ts";
import { MediaAssetBrowser } from "@/features/system/media/MediaAssetBrowser.tsx";
import { MediaDeleteDialog } from "@/features/system/media/MediaDeleteDialog.tsx";
import { MediaPageHeader, type MediaViewMode } from "@/features/system/media/MediaPageHeader.tsx";
import { MediaUploadConflictDialog } from "@/features/system/media/MediaUploadConflictDialog.tsx";
import { MediaUploadOverlay } from "@/features/system/media/MediaUploadOverlay.tsx";
import { useMediaDropZone } from "@/features/system/media/useMediaDropZone.ts";
import { type SelectionBox, useMediaSelection } from "@/features/system/media/useMediaSelection.ts";
import { useMediaUploadWorkflow } from "@/features/system/media/useMediaUploadWorkflow.ts";

interface MediaPageState {
  selectedIds: number[];
  selectionAnchorId: number | null;
  draft: { name: string; alias: string };
  actionError: string | null;
  copied: "url" | "markdown" | null;
  deleteTargets: MediaAsset[] | null;
  hasAutoSelected: boolean;
  isDragActive: boolean;
  selectionBox: SelectionBox | null;
}

type MediaPageAction = Partial<MediaPageState>;

function mediaPageReducer(state: MediaPageState, action: MediaPageAction): MediaPageState {
  return { ...state, ...action };
}

export function MediaPage() {
  const { locale, messages } = useI18n();
  const { user } = useAuth();
  const mediaMessages = messages.media;
  const common = messages.common;
  const [viewMode, setViewMode] = useState<MediaViewMode>("grid");
  const [state, dispatch] = useReducer(mediaPageReducer, {
    selectedIds: [],
    selectionAnchorId: null,
    draft: { name: "", alias: "" },
    actionError: null,
    copied: null,
    deleteTargets: null,
    hasAutoSelected: false,
    isDragActive: false,
    selectionBox: null,
  });
  const {
    selectedIds,
    selectionAnchorId,
    draft,
    actionError,
    copied,
    deleteTargets,
    hasAutoSelected,
    isDragActive,
    selectionBox,
  } = state;

  const { data: assets = [], isLoading } = useAdminMedia();
  const renameMedia = useRenameMedia();
  const deleteMedia = useDeleteMediaAssets();
  const syncMedia = useSyncMedia();

  const selectedIdSet = useMemo(() => new Set(selectedIds), [selectedIds]);
  const selectedAssets = assets.filter((asset) => selectedIdSet.has(asset.id));
  const selectedAsset = selectedAssets.length === 1 ? selectedAssets[0] : null;
  const {
    canUploadWithNewName,
    handleUpload,
    handleUploadBundles,
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
  } = useMediaUploadWorkflow({
    assets,
    locale,
    mediaMessages,
    onActionError: (message) => dispatch({ actionError: message }),
    onUploadedAssetSelect: (asset) =>
      dispatch({ selectedIds: [asset.id], selectionAnchorId: asset.id }),
  });
  const {
    handleMediaAreaClick,
    handleSelectAsset,
    handleSelectionAreaKeyDown,
    handleSelectionMouseDown,
    selectionAreaRef,
  } = useMediaSelection({
    assets,
    deleteDialogOpen: deleteTargets !== null,
    selectedIds,
    selectedIdSet,
    selectionAnchorId,
    updateSelectionState: dispatch,
  });
  const { handleDragEnter, handleDragLeave, handleDragOver, handleDrop } = useMediaDropZone({
    mediaMessages,
    onActionError: (message) => dispatch({ actionError: message }),
    onDragActiveChange: (active) => dispatch({ isDragActive: active }),
    onUploadBundles: handleUploadBundles,
    onUploadFiles: handleUpload,
    onUploadProgressChange: handleUploadProgressChange,
  });

  useEffect(() => {
    if (assets.length === 0) {
      dispatch({ selectedIds: [], selectionAnchorId: null, hasAutoSelected: false });
      return;
    }

    const existingIds = new Set(assets.map((asset) => asset.id));
    const nextSelectedIds = selectedIds.filter((id) => existingIds.has(id));
    if (nextSelectedIds.length !== selectedIds.length) {
      dispatch({
        selectedIds: nextSelectedIds,
        selectionAnchorId:
          selectionAnchorId !== null && existingIds.has(selectionAnchorId)
            ? selectionAnchorId
            : (nextSelectedIds.at(-1) ?? null),
      });
      return;
    }

    if (selectedIds.length === 0 && !hasAutoSelected) {
      dispatch({
        selectedIds: [assets[0].id],
        selectionAnchorId: assets[0].id,
        hasAutoSelected: true,
      });
    }
  }, [assets, hasAutoSelected, selectedIds, selectionAnchorId]);

  useEffect(() => {
    dispatch({
      draft: {
        name: selectedAsset?.displayName ?? "",
        alias: selectedAsset?.alias ?? "",
      },
    });
    dispatch({ copied: null });
  }, [selectedAsset]);

  useEffect(() => {
    if (!copied) return;
    const timer = window.setTimeout(() => dispatch({ copied: null }), 1500);
    return () => window.clearTimeout(timer);
  }, [copied]);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key !== "Escape" || deleteTargets) return;
      dispatch({ selectedIds: [], selectionAnchorId: null });
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [deleteTargets]);

  async function handleCopyUrl() {
    if (!selectedAsset) return;
    await navigator.clipboard.writeText(selectedAsset.url);
    dispatch({ copied: "url" });
  }

  async function handleCopyMarkdownEmbed() {
    if (!selectedAsset) return;
    await navigator.clipboard.writeText(getHlsMarkdownEmbed(selectedAsset));
    dispatch({ copied: "markdown" });
  }

  async function handleSaveMeta() {
    if (!selectedAsset) return;

    const nextName = draft.name.trim();
    const nextAlias = draft.alias.trim() || null;
    if (!nextName) return;

    const nameChanged = nextName !== selectedAsset.displayName;
    const aliasChanged = nextAlias !== (selectedAsset.alias ?? null);
    if (!nameChanged && !aliasChanged) return;

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

  function handleConfirmDelete() {
    if (!deleteTargets || deleteTargets.length === 0) return;
    const idsToDelete = deleteTargets.map((asset) => asset.id);
    deleteMedia.mutate(idsToDelete, {
      onSuccess: () => {
        dispatch({
          selectedIds: selectedIds.filter((id) => !idsToDelete.includes(id)),
          selectionAnchorId: null,
          deleteTargets: null,
        });
      },
      onError: (error) => {
        dispatch({
          actionError: error instanceof Error ? error.message : common.unknownError,
        });
      },
    });
  }

  const showUploadOverlay = isDragActive || uploadProgress !== null;

  return (
    <PageLayout>
      <MediaPageHeader
        isSyncing={syncMedia.isPending}
        isUploading={isUploading}
        mediaMessages={mediaMessages}
        onSync={() => syncMedia.mutate()}
        onUploadFiles={(files) => void handleUpload(files)}
        onViewModeChange={setViewMode}
        userId={user?.id}
        viewMode={viewMode}
      />

      {actionError && <p className="text-sm text-red-500 mb-3">{actionError}</p>}

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
          draft={draft}
          isDeleting={deleteMedia.isPending}
          isLoading={isLoading}
          isRenaming={renameMedia.isPending}
          locale={locale}
          mediaMessages={mediaMessages}
          onAreaClick={handleMediaAreaClick}
          onAreaKeyDown={handleSelectionAreaKeyDown}
          onAreaMouseDown={handleSelectionMouseDown}
          onCopyMarkdownEmbed={() => void handleCopyMarkdownEmbed()}
          onCopyUrl={() => void handleCopyUrl()}
          onDeleteSelection={() => dispatch({ deleteTargets: selectedAssets })}
          onDeleteSingle={() => {
            if (selectedAsset) dispatch({ deleteTargets: [selectedAsset] });
          }}
          onDraftChange={(updated) => dispatch({ draft: updated })}
          onSaveMeta={() => void handleSaveMeta()}
          onSelectAsset={handleSelectAsset}
          selectedAsset={selectedAsset}
          selectedAssets={selectedAssets}
          selectedIdSet={selectedIdSet}
          selectionAreaRef={selectionAreaRef}
          selectionBox={selectionBox}
          viewMode={viewMode}
        />

        <MediaUploadOverlay
          detail={uploadOverlayDetail}
          show={showUploadOverlay}
          title={uploadOverlayTitle}
          uploadHint={mediaMessages.uploadHint}
          uploadProgress={uploadProgress}
          uploadProgressValue={uploadProgressValue}
        />
      </PageBody>

      <PageFooter>
        <span className="text-xs text-[var(--ds-text-subtle)]">{mediaMessages.uploadHint}</span>
      </PageFooter>

      <MediaUploadConflictDialog
        canRename={canUploadWithNewName}
        common={common}
        conflict={uploadConflict}
        draftConflict={uploadConflictDraftConflict}
        draftName={uploadConflictDraftName}
        mediaMessages={mediaMessages}
        onCancel={handleUploadConflictCancel}
        onDraftNameChange={handleUploadConflictDraftNameChange}
        onOverwrite={handleUploadConflictOverwrite}
        onRename={handleUploadConflictRename}
      />

      <MediaDeleteDialog
        common={common}
        isDeleting={deleteMedia.isPending}
        mediaMessages={mediaMessages}
        onClose={() => dispatch({ deleteTargets: null })}
        onConfirm={handleConfirmDelete}
        targets={deleteTargets}
      />
    </PageLayout>
  );
}
