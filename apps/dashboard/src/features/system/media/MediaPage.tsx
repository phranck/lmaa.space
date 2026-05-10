import {
  ArrowsClockwiseIcon,
  FileIcon,
  ImageIcon,
  ListBulletsIcon,
  PlusCircleIcon,
  SquaresFourIcon,
  TrashIcon,
} from "@phosphor-icons/react";
import { useEffect, useReducer, useRef, useState } from "react";

import type { MediaAsset } from "@lmaa/shared";

import { ContentUnavailableView } from "@/components/ui/ContentUnavailableView.tsx";
import {
  CancelActionButton,
  DeleteActionButton,
} from "@/components/ui/DashboardActionButton.tsx";
import { DashboardButton } from "@/components/ui/DashboardButton.tsx";
import {
  Dialog,
  dialogHeaderIconClass,
} from "@/components/ui/Dialog.tsx";
import { PageFooter } from "@/components/ui/PageFooter.tsx";
import { PageHeader } from "@/components/ui/PageHeader.tsx";
import {
  PageBody,
  PageLayout,
  PageSplitAside,
  PageSplitLayout,
  PageSplitMain,
} from "@/components/ui/PageLayout.tsx";
import { SegmentedControl } from "@/components/ui/SegmentedControl.tsx";
import { useI18n } from "@/context/I18nContext.tsx";
import { useAuth } from "@/features/auth/AuthContext.tsx";
import {
  useAdminMedia,
  useDeleteMedia,
  useRenameMedia,
  useSyncMedia,
  useUploadMedia,
} from "@/features/system/hooks/useAdminMedia.ts";
import { MediaDetailSidebar } from "@/features/system/media/MediaDetailSidebar.tsx";
import { MediaGridItem } from "@/features/system/media/MediaGridItem.tsx";
import { MediaTable } from "@/features/system/media/MediaTable.tsx";
import { getSegmentedStorageKey } from "@/lib/segmented-storage.ts";

type ViewMode = "list" | "grid";

interface MediaPageState {
  selectedId: number | null;
  draft: { name: string; alias: string };
  actionError: string | null;
  copied: boolean;
  deleteTarget: MediaAsset | null;
  isDragActive: boolean;
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
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [state, dispatch] = useReducer(mediaPageReducer, {
    selectedId: null,
    draft: { name: "", alias: "" },
    actionError: null,
    copied: false,
    deleteTarget: null,
    isDragActive: false,
  });
  const { selectedId, draft, actionError, copied, deleteTarget, isDragActive } = state;
  const inputRef = useRef<HTMLInputElement>(null);
  const dragDepthRef = useRef(0);

  const { data: assets = [], isLoading } = useAdminMedia();
  const uploadMedia = useUploadMedia();
  const renameMedia = useRenameMedia();
  const deleteMedia = useDeleteMedia();
  const syncMedia = useSyncMedia();

  const selectedAsset = assets.find((asset) => asset.id === selectedId) ?? null;

  useEffect(() => {
    if (assets.length === 0) {
      dispatch({ selectedId: null });
      return;
    }

    if (!selectedId || !assets.some((asset) => asset.id === selectedId)) {
      dispatch({ selectedId: assets[0].id });
    }
  }, [assets, selectedId]);

  useEffect(() => {
    dispatch({ draft: {
      name: selectedAsset?.displayName ?? "",
      alias: selectedAsset?.alias ?? "",
    } });
    dispatch({ copied: false });
  }, [selectedAsset]);

  useEffect(() => {
    if (!copied) return;
    const timer = window.setTimeout(() => dispatch({ copied: false }), 1500);
    return () => window.clearTimeout(timer);
  }, [copied]);

  async function handleUpload(files: FileList | null) {
    if (!files?.length) return;

    dispatch({ actionError: null });
    let lastUploaded: MediaAsset | null = null;

    try {
      for (const file of Array.from(files)) {
        lastUploaded = await uploadMedia.mutateAsync(file);
      }

      if (lastUploaded) {
        dispatch({ selectedId: lastUploaded.id });
      }
    } catch (error) {
      dispatch({ actionError: error instanceof Error ? error.message : mediaMessages.uploadError });
    }
  }

  function hasDraggedFiles(event: React.DragEvent<HTMLDivElement>) {
    return Array.from(event.dataTransfer.types).includes("Files");
  }

  function handleDragEnter(event: React.DragEvent<HTMLDivElement>) {
    if (!hasDraggedFiles(event)) return;
    event.preventDefault();
    dragDepthRef.current += 1;
    dispatch({ isDragActive: true });
  }

  function handleDragOver(event: React.DragEvent<HTMLDivElement>) {
    if (!hasDraggedFiles(event)) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = "copy";
  }

  function handleDragLeave(event: React.DragEvent<HTMLDivElement>) {
    if (!hasDraggedFiles(event)) return;
    event.preventDefault();
    dragDepthRef.current = Math.max(0, dragDepthRef.current - 1);
    if (dragDepthRef.current === 0) {
      dispatch({ isDragActive: false });
    }
  }

  function handleDrop(event: React.DragEvent<HTMLDivElement>) {
    if (!hasDraggedFiles(event)) return;
    event.preventDefault();
    dragDepthRef.current = 0;
    dispatch({ isDragActive: false });
    void handleUpload(event.dataTransfer.files);
  }

  async function handleCopyUrl() {
    if (!selectedAsset) return;
    await navigator.clipboard.writeText(selectedAsset.url);
    dispatch({ copied: true });
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
      await renameMedia.mutateAsync({ id: selectedAsset.id, displayName: nextName, alias: nextAlias });
    } catch (error) {
      dispatch({ actionError: error instanceof Error ? error.message : mediaMessages.renameError });
    }
  }

  return (
    <PageLayout>
      <PageHeader title={mediaMessages.title}>
        <SegmentedControl
          value={viewMode}
          onChange={(value) => setViewMode(value as ViewMode)}
          storageKey={getSegmentedStorageKey(user?.id, "media:view")}
          options={[
            { value: "list", icon: <ListBulletsIcon weight="duotone" className="size-4" /> },
            { value: "grid", icon: <SquaresFourIcon weight="duotone" className="size-4" /> },
          ]}
        />

        <input
          ref={inputRef}
          type="file"
          multiple
          className="hidden"
          accept="image/*,.pdf,.txt,.md,.csv,.doc,.docx,.xls,.xlsx,.ppt,.pptx"
          onChange={(event) => {
            void handleUpload(event.target.files);
            event.currentTarget.value = "";
          }}
        />

        <DashboardButton
          onClick={() => syncMedia.mutate()}
          disabled={syncMedia.isPending}
          leadingIcon={
            <ArrowsClockwiseIcon
              weight="duotone"
              className={`size-3.5 ${syncMedia.isPending ? "animate-spin" : ""}`}
            />
          }
          variant="neutral"
        >
          Sync
        </DashboardButton>

        <DashboardButton
          onClick={() => inputRef.current?.click()}
          disabled={uploadMedia.isPending}
          leadingIcon={<PlusCircleIcon weight="duotone" className="size-3.5" />}
          variant="primary"
        >
          {uploadMedia.isPending ? mediaMessages.uploading : mediaMessages.upload}
        </DashboardButton>
      </PageHeader>

      {actionError && <p className="text-sm text-red-500 mb-3">{actionError}</p>}

      <PageBody
        className="relative"
        onDragEnter={handleDragEnter}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {assets.length > 0 ? (
          <PageSplitLayout>
            <PageSplitMain>
              {isLoading && (
                <div className={viewMode === "grid" ? "grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4" : "space-y-2"}>
                  {Array.from({ length: 8 }, (_, index) => `media-sk-${index}`).map((key) => (
                    <div key={key} className={`bg-[var(--ds-surface)] rounded-xl border border-[var(--ds-border-subtle)] animate-pulse ${viewMode === "grid" ? "aspect-[4/3]" : "h-16"}`} />
                  ))}
                </div>
              )}

              {!isLoading && viewMode === "list" && (
                <div className="-mx-3 -mt-3">
                  <MediaTable assets={assets} selectedId={selectedId} onSelect={(id) => dispatch({ selectedId: id })} />
                </div>
              )}

              {!isLoading && viewMode === "grid" && (
                <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 gap-3">
                  {assets.map((asset) => (
                    <MediaGridItem
                      key={asset.id}
                      asset={asset}
                      selected={asset.id === selectedId}
                      onSelect={(id) => dispatch({ selectedId: id })}
                    />
                  ))}
                </div>
              )}
            </PageSplitMain>

            <PageSplitAside className="self-start xl:sticky xl:top-[4.75rem]">
              {selectedAsset ? (
                <MediaDetailSidebar
                  asset={selectedAsset}
                  draft={draft}
                  onDraftChange={(updated) => dispatch({ draft: updated })}
                  onSaveMeta={() => void handleSaveMeta()}
                  onDelete={() => dispatch({ deleteTarget: selectedAsset })}
                  onCopyUrl={() => void handleCopyUrl()}
                  copied={copied}
                  isRenaming={renameMedia.isPending}
                  locale={locale}
                  mediaMessages={mediaMessages}
                  common={common}
                />
              ) : (
                <ContentUnavailableView
                  icon={<FileIcon weight="duotone" aria-hidden />}
                  title={mediaMessages.detailsTitle}
                  subtitle={mediaMessages.selectPrompt}
                  className="flex-1 min-h-[22rem]"
                />
              )}
            </PageSplitAside>
          </PageSplitLayout>
        ) : (
          !isLoading && (
            <ContentUnavailableView
              chromeless
              icon={<ImageIcon weight="duotone" aria-hidden />}
              title={mediaMessages.empty}
              subtitle={mediaMessages.emptyHint}
              className="flex-1 min-h-0"
            />
          )
        )}

        <div
          aria-hidden={!isDragActive}
          className={`pointer-events-none absolute inset-0 z-10 flex items-center justify-center rounded-[1.25rem] border-2 border-dashed transition-all ${
            isDragActive
              ? "border-[var(--color-primary)] bg-[color-mix(in_srgb,var(--color-primary)_10%,transparent)] opacity-100"
              : "border-transparent bg-transparent opacity-0"
          }`}
        >
          <div className="rounded-2xl border border-[var(--ds-border)] bg-[var(--ds-surface)]/95 px-6 py-5 text-center shadow-lg backdrop-blur-sm">
            <PlusCircleIcon weight="duotone" className="mx-auto mb-3 size-8 text-[var(--color-primary)]" />
            <p className="text-sm font-medium text-[var(--ds-text)]">{mediaMessages.upload}</p>
            <p className="mt-1 text-xs text-[var(--ds-text-subtle)]">{mediaMessages.uploadHint}</p>
          </div>
        </div>
      </PageBody>

      <PageFooter>
        <span className="text-xs text-[var(--ds-text-subtle)]">{mediaMessages.uploadHint}</span>
      </PageFooter>

      <Dialog
        open={deleteTarget !== null}
        title={mediaMessages.deleteTitle}
        titleIcon={<TrashIcon weight="duotone" className={dialogHeaderIconClass} />}
        onClose={() => dispatch({ deleteTarget: null })}
      >
        <div className="px-6 py-3">
          <p className="text-sm text-[var(--ds-text-muted)]">
            <span className="font-medium">{deleteTarget?.displayName}</span>{" "}
            {mediaMessages.deleteDescription}
          </p>
        </div>
        <Dialog.Footer>
          <CancelActionButton
            label={common.cancel}
            onClick={() => dispatch({ deleteTarget: null })}
          />
          <DeleteActionButton
            disabled={deleteMedia.isPending || !deleteTarget}
            label={deleteMedia.isPending ? "…" : common.delete}
            onClick={() => {
              if (!deleteTarget) return;
              deleteMedia.mutate(deleteTarget.id, {
                onSuccess: () => {
                  if (selectedId === deleteTarget.id) {
                    dispatch({ selectedId: null });
                  }
                  dispatch({ deleteTarget: null });
                },
                onError: (error) => {
                  dispatch({ actionError: error instanceof Error ? error.message : common.unknownError });
                },
              });
            }}
          />
        </Dialog.Footer>
      </Dialog>
    </PageLayout>
  );
}
