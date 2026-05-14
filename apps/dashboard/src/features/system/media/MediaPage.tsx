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
import { MEDIA_UPLOAD_ACCEPT, MEDIA_UPLOAD_MAX_BYTES, MEDIA_UPLOAD_MAX_LABEL } from "@lmaa/shared";

import { ContentUnavailableView } from "@/components/ui/ContentUnavailableView.tsx";
import { CancelActionButton, DeleteActionButton } from "@/components/ui/DashboardActionButton.tsx";
import { DashboardButton } from "@/components/ui/DashboardButton.tsx";
import { Dialog, dialogHeaderIconClass } from "@/components/ui/Dialog.tsx";
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
  useUploadHlsBundle,
  useUploadMedia,
} from "@/features/system/hooks/useAdminMedia.ts";
import type {
  MediaBundleUpload,
  MediaBundleUploadFile,
} from "@/features/system/hooks/useAdminMedia.ts";
import { formatBytes, getHlsMarkdownEmbed } from "@/features/system/media/media-utils.ts";
import { MediaDetailSidebar } from "@/features/system/media/MediaDetailSidebar.tsx";
import { MediaGridItem } from "@/features/system/media/MediaGridItem.tsx";
import { MediaTable } from "@/features/system/media/MediaTable.tsx";
import { getSegmentedStorageKey } from "@/lib/segmented-storage.ts";

type ViewMode = "list" | "grid";

interface BrowserFileSystemEntry {
  name: string;
  isFile: boolean;
  isDirectory: boolean;
}

interface BrowserFileSystemFileEntry extends BrowserFileSystemEntry {
  isFile: true;
  file: (success: (file: File) => void, failure?: (error: DOMException) => void) => void;
}

interface BrowserFileSystemFileHandle {
  entry: BrowserFileSystemFileEntry;
  relativePath: string;
}

interface BrowserFileSystemDirectoryReader {
  readEntries: (
    success: (entries: BrowserFileSystemEntry[]) => void,
    failure?: (error: DOMException) => void,
  ) => void;
}

interface BrowserFileSystemDirectoryEntry extends BrowserFileSystemEntry {
  isDirectory: true;
  createReader: () => BrowserFileSystemDirectoryReader;
}

interface DirectoryReadProgress {
  name: string;
  filesRead: number;
  filesTotal: number;
}

interface DroppedHlsBundleCollection {
  bundles: MediaBundleUpload[];
  directoryCount: number;
  emptyDirectories: string[];
  unsupportedItemCount: number;
}

function getFileSystemEntry(item: DataTransferItem): BrowserFileSystemEntry | null {
  const entryGetter = (
    item as DataTransferItem & {
      webkitGetAsEntry?: () => BrowserFileSystemEntry | null;
    }
  ).webkitGetAsEntry;

  return entryGetter?.call(item) ?? null;
}

function readFileEntry(entry: BrowserFileSystemFileEntry): Promise<File> {
  return new Promise((resolve, reject) => entry.file(resolve, reject));
}

function readDirectoryEntries(
  reader: BrowserFileSystemDirectoryReader,
): Promise<BrowserFileSystemEntry[]> {
  return new Promise((resolve, reject) => reader.readEntries(resolve, reject));
}

async function readAllDirectoryEntries(
  directory: BrowserFileSystemDirectoryEntry,
): Promise<BrowserFileSystemEntry[]> {
  const reader = directory.createReader();
  const entries: BrowserFileSystemEntry[] = [];

  for (;;) {
    const batch = await readDirectoryEntries(reader);
    if (batch.length === 0) break;
    entries.push(...batch);
  }

  return entries;
}

async function collectEntryFiles(
  entry: BrowserFileSystemEntry,
  parentPath: string,
): Promise<BrowserFileSystemFileHandle[]> {
  const relativePath = parentPath ? `${parentPath}/${entry.name}` : entry.name;

  if (entry.isFile) {
    return [{ entry: entry as BrowserFileSystemFileEntry, relativePath }];
  }

  if (entry.isDirectory) {
    const children = await readAllDirectoryEntries(entry as BrowserFileSystemDirectoryEntry);
    const nestedFiles = await Promise.all(
      children.map((child) => collectEntryFiles(child, relativePath)),
    );
    return nestedFiles.flat();
  }

  return [];
}

async function readBundleFiles(
  name: string,
  handles: BrowserFileSystemFileHandle[],
  onProgress?: (progress: DirectoryReadProgress) => void,
): Promise<MediaBundleUploadFile[]> {
  const files: MediaBundleUploadFile[] = [];

  onProgress?.({ name, filesRead: 0, filesTotal: handles.length });

  for (const [index, handle] of handles.entries()) {
    const file = await readFileEntry(handle.entry);
    files.push({ file, relativePath: handle.relativePath });
    onProgress?.({ name, filesRead: index + 1, filesTotal: handles.length });
  }

  return files;
}

async function collectDroppedHlsBundles(
  items: DataTransferItem[],
  onProgress?: (progress: DirectoryReadProgress) => void,
): Promise<DroppedHlsBundleCollection> {
  const collection: DroppedHlsBundleCollection = {
    bundles: [],
    directoryCount: 0,
    emptyDirectories: [],
    unsupportedItemCount: 0,
  };

  for (const item of items) {
    const entry = getFileSystemEntry(item);
    if (!entry) {
      collection.unsupportedItemCount += 1;
      continue;
    }

    if (!entry.isDirectory) continue;

    collection.directoryCount += 1;

    const children = await readAllDirectoryEntries(entry as BrowserFileSystemDirectoryEntry);
    const handles = (
      await Promise.all(children.map((child) => collectEntryFiles(child, "")))
    ).flat();

    if (handles.length === 0) {
      collection.emptyDirectories.push(entry.name);
      continue;
    }

    const files = await readBundleFiles(entry.name, handles, onProgress);
    collection.bundles.push({ name: entry.name, files });
  }

  return collection;
}

interface MediaPageState {
  selectedId: number | null;
  draft: { name: string; alias: string };
  actionError: string | null;
  copied: "url" | "markdown" | null;
  deleteTarget: MediaAsset | null;
  hasAutoSelected: boolean;
  isDragActive: boolean;
  uploadProgress: MediaUploadProgress | null;
}

type MediaPageAction = Partial<MediaPageState>;

type MediaUploadPhase = "reading" | "uploading" | "processing";

interface MediaUploadProgress {
  phase: MediaUploadPhase;
  name: string;
  filesRead?: number;
  filesTotal?: number;
  bytesLoaded?: number;
  bytesTotal?: number;
  percent?: number | null;
}

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
    copied: null,
    deleteTarget: null,
    hasAutoSelected: false,
    isDragActive: false,
    uploadProgress: null,
  });
  const {
    selectedId,
    draft,
    actionError,
    copied,
    deleteTarget,
    hasAutoSelected,
    isDragActive,
    uploadProgress,
  } = state;
  const inputRef = useRef<HTMLInputElement>(null);
  const dragDepthRef = useRef(0);

  const { data: assets = [], isLoading } = useAdminMedia();
  const uploadMedia = useUploadMedia();
  const uploadHlsBundle = useUploadHlsBundle();
  const renameMedia = useRenameMedia();
  const deleteMedia = useDeleteMedia();
  const syncMedia = useSyncMedia();
  const isUploading = uploadMedia.isPending || uploadHlsBundle.isPending;

  const selectedAsset = assets.find((asset) => asset.id === selectedId) ?? null;

  useEffect(() => {
    if (assets.length === 0) {
      dispatch({ selectedId: null, hasAutoSelected: false });
      return;
    }

    if (selectedId !== null && !assets.some((asset) => asset.id === selectedId)) {
      dispatch({ selectedId: null });
      return;
    }

    if (selectedId === null && !hasAutoSelected) {
      dispatch({ selectedId: assets[0].id, hasAutoSelected: true });
    }
  }, [assets, hasAutoSelected, selectedId]);

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
      if (event.key !== "Escape" || deleteTarget) return;
      dispatch({ selectedId: null });
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [deleteTarget]);

  function getUploadProgressValue(progress: MediaUploadProgress | null) {
    if (!progress) return null;
    if (progress.phase === "reading" && progress.filesTotal && progress.filesTotal > 0) {
      return Math.round(((progress.filesRead ?? 0) / progress.filesTotal) * 100);
    }
    if (progress.phase === "uploading" && progress.percent !== undefined) {
      return progress.percent;
    }
    if (progress.phase === "processing") {
      return 100;
    }
    return null;
  }

  function getUploadProgressTitle(progress: MediaUploadProgress) {
    if (progress.phase === "reading") return mediaMessages.readingHlsFolder;
    if (progress.phase === "uploading") {
      return progress.filesTotal ? mediaMessages.uploadingHlsBundle : mediaMessages.uploadingFile;
    }
    return mediaMessages.processingUpload;
  }

  function getUploadProgressDetail(progress: MediaUploadProgress) {
    if (progress.phase === "reading" && progress.filesTotal !== undefined) {
      return mediaMessages.readingFilesProgress
        .replace("{read}", String(progress.filesRead ?? 0))
        .replace("{total}", String(progress.filesTotal));
    }

    if (progress.phase === "uploading") {
      const percent = progress.percent ?? getUploadProgressValue(progress);
      const size =
        progress.bytesTotal && progress.bytesTotal > 0
          ? ` · ${formatBytes(progress.bytesLoaded ?? 0, locale, { fixedFractionDigits: 1 })} / ${formatBytes(progress.bytesTotal, locale, { fixedFractionDigits: 1 })}`
          : "";
      return percent !== null
        ? mediaMessages.uploadProgress.replace("{percent}", String(percent)) + size
        : mediaMessages.uploadProgressUnknown + size;
    }

    return mediaMessages.processingUploadHint;
  }

  async function handleUpload(files: FileList | File[] | null) {
    const fileArray = Array.from(files ?? []);
    if (fileArray.length === 0) return;

    dispatch({ actionError: null });
    const oversizedFile = fileArray.find((file) => file.size > MEDIA_UPLOAD_MAX_BYTES);
    if (oversizedFile) {
      dispatch({
        actionError: mediaMessages.uploadTooLarge
          .replace("{name}", oversizedFile.name)
          .replace("{max}", MEDIA_UPLOAD_MAX_LABEL),
      });
      return;
    }

    let lastUploaded: MediaAsset | null = null;

    try {
      for (const file of fileArray) {
        dispatch({
          uploadProgress: {
            phase: "uploading",
            name: file.name,
            bytesLoaded: 0,
            bytesTotal: file.size,
            percent: 0,
          },
        });
        lastUploaded = await uploadMedia.mutateAsync({
          file,
          onProgress: (progress) => {
            dispatch({
              uploadProgress: {
                phase: "uploading",
                name: file.name,
                bytesLoaded: progress.loaded,
                bytesTotal: progress.total ?? file.size,
                percent: progress.percent,
              },
            });
          },
          onUploadComplete: () => {
            dispatch({
              uploadProgress: {
                phase: "processing",
                name: file.name,
                bytesLoaded: file.size,
                bytesTotal: file.size,
                percent: 100,
              },
            });
          },
        });
      }

      if (lastUploaded) {
        dispatch({ selectedId: lastUploaded.id });
      }
    } catch (error) {
      dispatch({ actionError: error instanceof Error ? error.message : mediaMessages.uploadError });
    } finally {
      dispatch({ uploadProgress: null });
    }
  }

  async function handleUploadBundles(bundles: MediaBundleUpload[]) {
    if (bundles.length === 0) return;

    dispatch({ actionError: null });

    const oversizedBundle = bundles.find(
      (bundle) =>
        bundle.files.reduce((sum, item) => sum + item.file.size, 0) > MEDIA_UPLOAD_MAX_BYTES,
    );

    if (oversizedBundle) {
      dispatch({
        actionError: mediaMessages.uploadTooLarge
          .replace("{name}", oversizedBundle.name)
          .replace("{max}", MEDIA_UPLOAD_MAX_LABEL),
      });
      return;
    }

    let lastUploaded: MediaAsset | null = null;

    try {
      for (const bundle of bundles) {
        const bundleSize = bundle.files.reduce((sum, item) => sum + item.file.size, 0);
        const fileCount = bundle.files.length;
        dispatch({
          uploadProgress: {
            phase: "uploading",
            name: bundle.name,
            filesTotal: fileCount,
            bytesLoaded: 0,
            bytesTotal: bundleSize,
            percent: 0,
          },
        });
        lastUploaded = await uploadHlsBundle.mutateAsync({
          ...bundle,
          onProgress: (progress) => {
            dispatch({
              uploadProgress: {
                phase: "uploading",
                name: bundle.name,
                filesTotal: fileCount,
                bytesLoaded: progress.loaded,
                bytesTotal: progress.total ?? bundleSize,
                percent: progress.percent,
              },
            });
          },
          onUploadComplete: () => {
            dispatch({
              uploadProgress: {
                phase: "processing",
                name: bundle.name,
                filesTotal: fileCount,
                bytesLoaded: bundleSize,
                bytesTotal: bundleSize,
                percent: 100,
              },
            });
          },
        });
      }

      if (lastUploaded) {
        dispatch({ selectedId: lastUploaded.id });
      }
    } catch (error) {
      dispatch({ actionError: error instanceof Error ? error.message : mediaMessages.uploadError });
    } finally {
      dispatch({ uploadProgress: null });
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
    const { dataTransfer } = event;
    const droppedItems = Array.from(dataTransfer.items);
    const droppedFiles = Array.from(dataTransfer.files);
    const hasDirectoryEntry = droppedItems.some((item) => getFileSystemEntry(item)?.isDirectory);
    dragDepthRef.current = 0;
    dispatch({
      actionError: null,
      isDragActive: false,
      uploadProgress: hasDirectoryEntry
        ? {
            phase: "reading",
            name: mediaMessages.hlsBundleFallbackName,
            filesRead: 0,
          }
        : null,
    });
    void (async () => {
      try {
        const collection = await collectDroppedHlsBundles(droppedItems, (progress) => {
          dispatch({
            uploadProgress: {
              phase: "reading",
              name: progress.name,
              filesRead: progress.filesRead,
              filesTotal: progress.filesTotal,
            },
          });
        });

        if (collection.bundles.length > 0) {
          await handleUploadBundles(collection.bundles);
          return;
        }

        if (collection.emptyDirectories.length > 0) {
          dispatch({
            actionError: mediaMessages.emptyFolderUpload.replace(
              "{name}",
              collection.emptyDirectories[0] ?? mediaMessages.hlsBundleFallbackName,
            ),
            uploadProgress: null,
          });
          return;
        }

        if (
          collection.directoryCount > 0 ||
          (collection.unsupportedItemCount > 0 && droppedFiles.length === 0)
        ) {
          dispatch({
            actionError: mediaMessages.directoryUploadUnsupported,
            uploadProgress: null,
          });
          return;
        }

        await handleUpload(droppedFiles);
      } catch (error) {
        dispatch({
          actionError: error instanceof Error ? error.message : mediaMessages.uploadError,
          uploadProgress: null,
        });
      }
    })();
  }

  function handleMediaAreaClick(event: React.MouseEvent<HTMLDivElement>) {
    const target = event.target;
    if (!(target instanceof Element)) return;
    if (target.closest("[data-media-asset-item]")) return;
    dispatch({ selectedId: null });
  }

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

  const uploadProgressValue = getUploadProgressValue(uploadProgress);
  const showUploadOverlay = isDragActive || uploadProgress !== null;

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
          accept={MEDIA_UPLOAD_ACCEPT}
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
          disabled={isUploading}
          leadingIcon={<PlusCircleIcon weight="duotone" className="size-3.5" />}
          variant="primary"
        >
          {isUploading ? mediaMessages.uploading : mediaMessages.upload}
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
            <PageSplitMain onClick={handleMediaAreaClick}>
              {isLoading && (
                <div
                  className={
                    viewMode === "grid"
                      ? "grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4"
                      : "space-y-2"
                  }
                >
                  {Array.from({ length: 8 }, (_, index) => `media-sk-${index}`).map((key) => (
                    <div
                      key={key}
                      className={`bg-[var(--ds-surface)] rounded-xl border border-[var(--ds-border-subtle)] animate-pulse ${viewMode === "grid" ? "aspect-[4/3]" : "h-16"}`}
                    />
                  ))}
                </div>
              )}

              {!isLoading && viewMode === "list" && (
                <div className="-mx-3 -mt-3">
                  <MediaTable
                    assets={assets}
                    selectedId={selectedId}
                    onSelect={(id) => dispatch({ selectedId: id })}
                  />
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
                  onCopyMarkdownEmbed={() => void handleCopyMarkdownEmbed()}
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
          aria-hidden={!showUploadOverlay}
          aria-live="polite"
          className={`pointer-events-none absolute inset-[3px] z-10 flex items-center justify-center rounded-[calc(1.25rem-3px)] border-2 border-dashed transition-all ${
            showUploadOverlay
              ? "border-[var(--color-primary)] bg-[color-mix(in_srgb,var(--color-primary)_10%,transparent)] opacity-100"
              : "border-transparent bg-transparent opacity-0"
          }`}
        >
          <div className="w-full max-w-sm rounded-2xl border border-[var(--ds-border)] bg-[var(--ds-surface)]/95 px-6 py-5 text-center shadow-lg backdrop-blur-sm">
            {uploadProgress ? (
              <ArrowsClockwiseIcon
                weight="duotone"
                className="mx-auto mb-3 size-8 animate-spin text-[var(--color-primary)]"
              />
            ) : (
              <PlusCircleIcon
                weight="duotone"
                className="mx-auto mb-3 size-8 text-[var(--color-primary)]"
              />
            )}
            <p className="text-sm font-medium text-[var(--ds-text)]">
              {uploadProgress ? getUploadProgressTitle(uploadProgress) : mediaMessages.dropTitle}
            </p>
            <p className="mt-1 truncate text-xs text-[var(--ds-text-muted)]">
              {uploadProgress?.name ?? mediaMessages.uploadHint}
            </p>
            <p className="mt-1 text-xs text-[var(--ds-text-subtle)]">
              {uploadProgress ? getUploadProgressDetail(uploadProgress) : mediaMessages.uploadHint}
            </p>
            {uploadProgress && (
              <div className="mt-4 h-2 overflow-hidden rounded-full bg-[var(--ds-bg-elevated)]">
                <div
                  className={`h-full rounded-full bg-[var(--color-primary)] transition-all ${
                    uploadProgressValue === null ? "w-1/3 animate-pulse" : ""
                  }`}
                  style={
                    uploadProgressValue !== null
                      ? { width: `${Math.min(100, Math.max(0, uploadProgressValue))}%` }
                      : undefined
                  }
                />
              </div>
            )}
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
                  dispatch({
                    actionError: error instanceof Error ? error.message : common.unknownError,
                  });
                },
              });
            }}
          />
        </Dialog.Footer>
      </Dialog>
    </PageLayout>
  );
}
