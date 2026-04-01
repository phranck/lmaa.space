import {
  ArrowLeftIcon,
  ArrowsClockwiseIcon,
  CopyIcon,
  FileIcon,
  FolderIcon,
  ImageIcon,
  ListBulletsIcon,
  PencilSimpleIcon,
  PlusCircleIcon,
  SquaresFourIcon,
  TrashIcon,
} from "@phosphor-icons/react";
import { useCallback, useEffect, useRef, useState } from "react";

import type { MediaAsset } from "@lmaa/shared";
import { DashboardSection } from "@lmaa/ui";

import { ContentUnavailableView } from "@/components/ui/ContentUnavailableView.tsx";
import {
  Dialog,
  dialogBtnDestructive,
  dialogBtnSecondary,
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
  useDeleteUnsplashCacheItem,
  usePurgeUnsplashCache,
  useRefetchUnsplashMeta,
  useRenameMedia,
  useSyncMedia,
  useUnsplashCacheMedia,
  useUploadMedia,
} from "@/features/system/hooks/useAdminMedia.ts";
import {
  formatBytes,
  formatMediaDate,
  getMediaTypeLabel,
  isImageAsset,
} from "@/features/system/media/media-utils.ts";
import { MediaGridItem } from "@/features/system/media/MediaGridItem.tsx";
import { MediaTable } from "@/features/system/media/MediaTable.tsx";
import { api } from "@/lib/api.ts";
import { getSegmentedStorageKey } from "@/lib/segmented-storage.ts";

type ViewMode = "list" | "grid";

function MediaPreview({
  asset,
  unsupportedPreview,
}: {
  asset: MediaAsset;
  unsupportedPreview: string;
}) {
  if (isImageAsset(asset)) {
    return (
      <div className="aspect-[4/3] rounded-xl overflow-hidden bg-[var(--ds-bg-elevated)]">
        <img src={asset.url} alt="" className="w-full h-full object-cover" />
      </div>
    );
  }

  return (
    <div className="aspect-[4/3] rounded-xl bg-[var(--ds-bg-elevated)] border border-dashed border-[var(--ds-border)] flex flex-col items-center justify-center gap-3 text-[var(--ds-text-subtle)]">
      <FileIcon weight="duotone" className="w-12 h-12" />
      <div className="text-center">
        <p className="text-sm font-medium text-[var(--ds-text)]">{getMediaTypeLabel(asset)}</p>
        <p className="text-xs">{unsupportedPreview}</p>
      </div>
    </div>
  );
}

export function MediaPage() {
  const { locale, messages } = useI18n();
  const { user } = useAuth();
  const mediaMessages = messages.media;
  const common = messages.common;
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [selectedCacheItemId, setSelectedCacheItemId] = useState<number | null>(null);
  const [selectedCacheItemType, setSelectedCacheItemType] = useState<"hero" | "categorie" | null>(null);
  const [currentFolder, setCurrentFolder] = useState<"root" | "cache">("root");
  const [cacheSubFolder, setCacheSubFolder] = useState<"hero" | "categorie" | null>(null);
  const [draftName, setDraftName] = useState("");
  const [draftAlias, setDraftAlias] = useState("");
  const [actionError, setActionError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [cacheCopied, setCacheCopied] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<MediaAsset | null>(null);
  const [isDragActive, setIsDragActive] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const dragDepthRef = useRef(0);

  const { data: assets = [], isLoading } = useAdminMedia();
  const { data: cacheItems = [], isLoading: cacheLoading } = useUnsplashCacheMedia();
  const uploadMedia = useUploadMedia();
  const renameMedia = useRenameMedia();
  const deleteMedia = useDeleteMedia();
  const syncMedia = useSyncMedia();
  const refetchMeta = useRefetchUnsplashMeta();
  const purgeCache = usePurgeUnsplashCache();
  const deleteCacheItem = useDeleteUnsplashCacheItem();
  const [refetchingImageId, setRefetchingImageId] = useState<number | null>(null);
  const [showPurgeDialog, setShowPurgeDialog] = useState(false);
  const [deleteCacheTarget, setDeleteCacheTarget] = useState<{ type: "hero" | "categorie"; unsplashImageId: number } | null>(null);

  const selectedAsset = assets.find((asset) => asset.id === selectedId) ?? null;
  const selectedCacheItem = cacheItems.find((item) => item.unsplashImageId === selectedCacheItemId && item.type === selectedCacheItemType) ?? null;

  useEffect(() => {
    if (assets.length === 0) {
      setSelectedId(null);
      return;
    }

    if (!selectedId || !assets.some((asset) => asset.id === selectedId)) {
      setSelectedId(assets[0].id);
    }
  }, [assets, selectedId]);

  useEffect(() => {
    if (currentFolder === "cache" && !selectedCacheItemId && cacheItems.length > 0) {
      setSelectedCacheItemId(cacheItems[0].unsplashImageId);
      setSelectedCacheItemType(cacheItems[0].type);
    }
  }, [currentFolder, cacheItems, selectedCacheItemId]);

  useEffect(() => {
    setDraftName(selectedAsset?.displayName ?? "");
    setDraftAlias(selectedAsset?.alias ?? "");
    setCopied(false);
  }, [selectedAsset]);

  useEffect(() => {
    if (!copied) return;
    const timer = window.setTimeout(() => setCopied(false), 1500);
    return () => window.clearTimeout(timer);
  }, [copied]);

  useEffect(() => {
    if (!cacheCopied) return;
    const timer = window.setTimeout(() => setCacheCopied(false), 1500);
    return () => window.clearTimeout(timer);
  }, [cacheCopied]);

  async function handleUpload(files: FileList | null) {
    if (!files?.length) return;

    setActionError(null);
    let lastUploaded: MediaAsset | null = null;

    try {
      for (const file of Array.from(files)) {
        lastUploaded = await uploadMedia.mutateAsync(file);
      }

      if (lastUploaded) {
        setSelectedId(lastUploaded.id);
      }
    } catch (error) {
      setActionError(error instanceof Error ? error.message : mediaMessages.uploadError);
    }
  }

  function hasDraggedFiles(event: React.DragEvent<HTMLDivElement>) {
    return Array.from(event.dataTransfer.types).includes("Files");
  }

  function handleDragEnter(event: React.DragEvent<HTMLDivElement>) {
    if (!hasDraggedFiles(event)) return;
    event.preventDefault();
    dragDepthRef.current += 1;
    setIsDragActive(true);
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
      setIsDragActive(false);
    }
  }

  function handleDrop(event: React.DragEvent<HTMLDivElement>) {
    if (!hasDraggedFiles(event)) return;
    event.preventDefault();
    dragDepthRef.current = 0;
    setIsDragActive(false);
    void handleUpload(event.dataTransfer.files);
  }

  const handleRefetchAll = useCallback(async () => {
    const sources = await api.get<{ unsplashImageId: number; unsplashId: string; type: "hero" | "categorie" }[]>("/admin/media/cache/sources");
    for (const source of sources) {
      setRefetchingImageId(source.unsplashImageId);
      try {
        await refetchMeta.mutateAsync({ type: source.type, unsplashId: source.unsplashId });
      } catch {
        // continue with next image
      }
    }
    setRefetchingImageId(null);
  }, [refetchMeta]);

  async function handleCopyUrl() {
    if (!selectedAsset) return;
    await navigator.clipboard.writeText(selectedAsset.url);
    setCopied(true);
  }

  async function handleSaveMeta() {
    if (!selectedAsset) return;

    const nextName = draftName.trim();
    const nextAlias = draftAlias.trim() || null;
    if (!nextName) return;

    const nameChanged = nextName !== selectedAsset.displayName;
    const aliasChanged = nextAlias !== (selectedAsset.alias ?? null);
    if (!nameChanged && !aliasChanged) return;

    setActionError(null);

    try {
      await renameMedia.mutateAsync({ id: selectedAsset.id, displayName: nextName, alias: nextAlias });
    } catch (error) {
      setActionError(error instanceof Error ? error.message : mediaMessages.renameError);
    }
  }

  return (
    <PageLayout>
      <PageHeader
        title={currentFolder === "cache" ? (cacheSubFolder ?? "unsplash") : mediaMessages.title}
        titleContent={currentFolder === "cache" ? (
          <div className="flex items-center gap-1.5 text-sm">
            <button
              type="button"
              onClick={() => {
                if (cacheSubFolder) {
                  setCacheSubFolder(null);
                  setSelectedCacheItemId(null);
                  setSelectedCacheItemType(null);
                } else {
                  setCurrentFolder("root");
                  setSelectedCacheItemId(null);
                  setSelectedCacheItemType(null);
                }
              }}
              className="flex items-center gap-1 text-[var(--ds-text-muted)] hover:text-[var(--ds-text)] transition-colors"
            >
              <ArrowLeftIcon weight="bold" className="w-3.5 h-3.5" />
              <span>{cacheSubFolder ? "unsplash" : mediaMessages.title}</span>
            </button>
            <span className="text-[var(--ds-text-muted)]">/</span>
            {cacheSubFolder ? (
              <>
                <button
                  type="button"
                  onClick={() => { setCacheSubFolder(null); setSelectedCacheItemId(null); setSelectedCacheItemType(null); }}
                  className="text-[var(--ds-text-muted)] hover:text-[var(--ds-text)] transition-colors"
                >
                  unsplash
                </button>
                <span className="text-[var(--ds-text-muted)]">/</span>
                <span className="font-semibold text-[var(--ds-text)]">{cacheSubFolder}</span>
              </>
            ) : (
              <span className="font-semibold text-[var(--ds-text)]">unsplash</span>
            )}
          </div>
        ) : undefined}
      >
        {currentFolder === "cache" ? (
          <>
            {cacheSubFolder && (
              <SegmentedControl
                value={viewMode}
                onChange={(value) => setViewMode(value as ViewMode)}
                storageKey={getSegmentedStorageKey(user?.id, "media:view")}
                options={[
                  { value: "list", icon: <ListBulletsIcon weight="duotone" className="w-4 h-4" /> },
                  { value: "grid", icon: <SquaresFourIcon weight="duotone" className="w-4 h-4" /> },
                ]}
              />
            )}
            <button
              type="button"
              onClick={() => void handleRefetchAll()}
              disabled={refetchingImageId !== null || purgeCache.isPending}
              className="flex items-center gap-2 py-1.5 px-4 border border-[var(--ds-border)] text-[var(--ds-text)] rounded-control text-sm font-medium hover:border-[var(--ds-border-strong)] disabled:opacity-60"
            >
              <ArrowsClockwiseIcon weight="duotone" className={`w-3.5 h-3.5 ${refetchingImageId !== null ? "animate-spin" : ""}`} />
              {refetchingImageId !== null ? mediaMessages.refetchMetaPending : mediaMessages.refetchMeta}
            </button>
            <button
              type="button"
              onClick={() => setShowPurgeDialog(true)}
              disabled={refetchingImageId !== null || purgeCache.isPending || cacheItems.length === 0}
              className="flex items-center gap-2 py-1.5 px-4 border border-[var(--ds-btn-danger-border)] text-[var(--ds-btn-danger-text)] rounded-control text-sm font-medium hover:border-[var(--ds-btn-danger-hover-border)] hover:bg-[var(--ds-btn-danger-hover-bg)] disabled:opacity-60"
            >
              <TrashIcon weight="duotone" className="w-3.5 h-3.5" />
              {mediaMessages.purgeCache}
            </button>
          </>
        ) : (
          <>
            <SegmentedControl
              value={viewMode}
              onChange={(value) => setViewMode(value as ViewMode)}
              storageKey={getSegmentedStorageKey(user?.id, "media:view")}
              options={[
                { value: "list", icon: <ListBulletsIcon weight="duotone" className="w-4 h-4" /> },
                { value: "grid", icon: <SquaresFourIcon weight="duotone" className="w-4 h-4" /> },
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

            <button
              type="button"
              onClick={() => syncMedia.mutate()}
              disabled={syncMedia.isPending}
              className="flex items-center gap-2 py-1.5 px-4 border border-[var(--ds-border)] text-[var(--ds-text)] rounded-control text-sm font-medium hover:border-[var(--ds-border-strong)] disabled:opacity-60"
            >
              <ArrowsClockwiseIcon weight="duotone" className={`w-3.5 h-3.5 ${syncMedia.isPending ? "animate-spin" : ""}`} />
              Sync
            </button>

            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              disabled={uploadMedia.isPending}
              className="flex items-center gap-2 py-1.5 px-4 border border-[var(--ds-btn-primary-border)] text-[var(--ds-btn-primary-text)] rounded-control text-sm font-medium hover:border-[var(--ds-btn-primary-hover-border)] hover:bg-[var(--ds-btn-primary-hover-bg)] disabled:opacity-60"
            >
              <PlusCircleIcon weight="duotone" className="w-3.5 h-3.5" />
              {uploadMedia.isPending ? mediaMessages.uploading : mediaMessages.upload}
            </button>
          </>
        )}
      </PageHeader>

      {actionError && <p className="text-sm text-red-500 mb-3">{actionError}</p>}

      <PageBody
        className="relative"
        onDragEnter={currentFolder === "root" ? handleDragEnter : undefined}
        onDragOver={currentFolder === "root" ? handleDragOver : undefined}
        onDragLeave={currentFolder === "root" ? handleDragLeave : undefined}
        onDrop={currentFolder === "root" ? handleDrop : undefined}
      >
        {currentFolder === "cache" ? (
          /* ── Cache folder view ─────────────────────────────────────── */
          cacheSubFolder === null ? (
            /* ── Sub-folder listing (hero/, categorie/) ──────────────── */
            (() => {
              const heroCount = cacheItems.filter((i) => i.type === "hero").length;
              const categorieCount = cacheItems.filter((i) => i.type === "categorie").length;
              return (
                <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 gap-3">
                  {(["hero", "categorie"] as const).map((type) => {
                    const cnt = type === "hero" ? heroCount : categorieCount;
                    return (
                      <button
                        key={type}
                        type="button"
                        onClick={() => setCacheSubFolder(type)}
                        className="flex flex-col items-center gap-1.5 p-2 rounded-xl transition-colors text-center"
                      >
                        <div className="w-full aspect-square rounded-lg flex flex-col items-center justify-center bg-[var(--ds-bg-elevated)] border-2 border-transparent hover:border-[var(--ds-border)] transition-colors gap-2">
                          <FolderIcon weight="duotone" className="w-16 h-16 text-amber-500" />
                        </div>
                        <div className="w-full px-0.5">
                          <p className="text-xs font-medium text-[var(--ds-text)] font-mono truncate">{type}/</p>
                          <p className="text-[10px] text-[var(--ds-text-muted)] truncate">{cnt > 0 ? `${cnt} Bilder` : mediaMessages.cacheFolderEmpty}</p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              );
            })()
          ) : (
            /* ── Sub-folder content (filtered by type) ───────────────── */
            (() => {
              const filteredItems = cacheItems.filter((i) => i.type === cacheSubFolder);
              return (
                <PageSplitLayout>
                  <PageSplitMain>
                    {cacheLoading && (
                      <div className={viewMode === "grid" ? "grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4" : "space-y-2"}>
                        {Array.from({ length: 6 }, (_, i) => `cache-sk-${i}`).map((key) => (
                          <div key={key} className={`bg-[var(--ds-surface)] rounded-xl border border-[var(--ds-border-subtle)] animate-pulse ${viewMode === "grid" ? "aspect-[4/3]" : "h-16"}`} />
                        ))}
                      </div>
                    )}
                    {!cacheLoading && filteredItems.length === 0 && (
                      <ContentUnavailableView
                        icon={<FolderIcon weight="duotone" aria-hidden />}
                        title={cacheSubFolder}
                        subtitle={mediaMessages.cacheFolderEmpty}
                        className="min-h-[22rem]"
                      />
                    )}
                    {!cacheLoading && filteredItems.length > 0 && viewMode === "grid" && (
                      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                        {filteredItems.map((item) => (
                          <div
                            key={item.unsplashImageId}
                            role="button"
                            tabIndex={0}
                            onClick={() => { setSelectedCacheItemId(item.unsplashImageId); setSelectedCacheItemType(item.type); }}
                            onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { setSelectedCacheItemId(item.unsplashImageId); setSelectedCacheItemType(item.type); } }}
                            className={`group relative rounded-xl overflow-hidden border-2 transition-colors text-left cursor-pointer ${item.unsplashImageId === selectedCacheItemId && item.type === selectedCacheItemType ? "border-[var(--color-primary)]" : "border-[var(--ds-border-subtle)] hover:border-[var(--ds-border)]"}`}
                          >
                            <img src={item.url} alt="" className="w-full aspect-[4/3] object-cover" loading="lazy" />
                            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent px-2 py-1.5">
                              <p className="text-white text-[10px] font-mono truncate">{item.unsplashImageId}</p>
                            </div>
                            {refetchingImageId === item.unsplashImageId && (
                              <div className="absolute top-2 right-2 rounded-full bg-black/50 p-1">
                                <ArrowsClockwiseIcon weight="bold" className="w-4 h-4 text-white animate-spin" />
                              </div>
                            )}
                            {/* Delete overlay */}
                            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100 z-10">
                              <button
                                type="button"
                                onClick={(e) => { e.stopPropagation(); setDeleteCacheTarget({ type: item.type, unsplashImageId: item.unsplashImageId }); }}
                                className="flex items-center gap-1.5 h-8 px-3 text-xs font-medium bg-white text-[var(--ds-btn-danger-text,#ef4444)] rounded-control hover:bg-red-50"
                              >
                                <TrashIcon weight="duotone" className="w-3.5 h-3.5" />
                                {mediaMessages.deleteCacheItem}
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                    {!cacheLoading && filteredItems.length > 0 && viewMode === "list" && (
                      <div className="-mx-3 -mt-3">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b border-[var(--ds-border-subtle)]">
                              <th className="px-3 py-2 text-left text-xs font-medium text-[var(--ds-text-subtle)]">Key</th>
                              <th className="px-3 py-2 text-left text-xs font-medium text-[var(--ds-text-subtle)]">{mediaMessages.fileSize}</th>
                            </tr>
                          </thead>
                          <tbody>
                            {filteredItems.map((item) => (
                              <tr
                                key={item.unsplashImageId}
                                onClick={() => { setSelectedCacheItemId(item.unsplashImageId); setSelectedCacheItemType(item.type); }}
                                className={`border-b border-[var(--ds-border-subtle)] cursor-pointer transition-colors ${item.unsplashImageId === selectedCacheItemId && item.type === selectedCacheItemType ? "bg-[color-mix(in_srgb,var(--color-primary)_8%,transparent)]" : "hover:bg-[var(--ds-bg-elevated)]"}`}
                              >
                                <td className="px-3 py-2.5 font-mono text-[var(--ds-text)]">
                                  <div className="flex items-center gap-2">
                                    <div className="relative shrink-0">
                                      <img src={item.url} alt="" className="w-8 h-8 rounded object-cover" loading="lazy" />
                                      {refetchingImageId === item.unsplashImageId && (
                                        <div className="absolute inset-0 flex items-center justify-center rounded bg-black/40">
                                          <ArrowsClockwiseIcon weight="bold" className="w-3.5 h-3.5 text-white animate-spin" />
                                        </div>
                                      )}
                                    </div>
                                    {item.unsplashImageId}
                                  </div>
                                </td>
                                <td className="px-3 py-2.5 text-[var(--ds-text-muted)]">{formatBytes(item.sizeBytes, locale)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </PageSplitMain>

                  <PageSplitAside className="self-start xl:sticky xl:top-[4.75rem]">
                    <div className="space-y-3">
                      {selectedCacheItem ? (
                        <>
                          <DashboardSection>
                            <DashboardSection.Header
                              icon={<ImageIcon weight="duotone" className="w-4 h-4" />}
                              title={mediaMessages.previewTitle}
                            />
                            <DashboardSection.Body>
                              <div className="rounded-xl overflow-hidden bg-[var(--ds-bg-elevated)]">
                                <img src={selectedCacheItem.url} alt="" className="w-full aspect-[4/3] object-cover" />
                              </div>
                            </DashboardSection.Body>
                          </DashboardSection>

                          <DashboardSection>
                            <DashboardSection.Header
                              icon={<FileIcon weight="duotone" className="w-4 h-4" />}
                              title={mediaMessages.infoTitle}
                            />
                            <DashboardSection.Body>
                              <div className="space-y-3 text-sm">
                                <div>
                                  <p className="text-[var(--ds-text-subtle)]">Key</p>
                                  <p className="text-[var(--ds-text)] font-mono">{selectedCacheItem.type}/{selectedCacheItem.unsplashImageId}</p>
                                </div>
                                {selectedCacheItem.unsplash && (
                                  <>
                                    {selectedCacheItem.unsplash.width && selectedCacheItem.unsplash.height && (
                                      <div>
                                        <p className="text-[var(--ds-text-subtle)]">{mediaMessages.dimensions}</p>
                                        <p className="text-[var(--ds-text)]">{selectedCacheItem.unsplash.width} x {selectedCacheItem.unsplash.height}px</p>
                                      </div>
                                    )}
                                    <div>
                                      <p className="text-[var(--ds-text-subtle)]">Fotograf</p>
                                      <a href={selectedCacheItem.unsplash.photographerUrl} target="_blank" rel="noopener noreferrer" className="text-[var(--color-primary)] hover:underline">
                                        {selectedCacheItem.unsplash.photographerName}
                                      </a>
                                    </div>
                                    {selectedCacheItem.unsplash.description && (
                                      <div>
                                        <p className="text-[var(--ds-text-subtle)]">Beschreibung</p>
                                        <p className="text-[var(--ds-text)]">{selectedCacheItem.unsplash.description}</p>
                                      </div>
                                    )}
                                    {selectedCacheItem.unsplash.color && (
                                      <div>
                                        <p className="text-[var(--ds-text-subtle)]">Farbe</p>
                                        <div className="flex items-center gap-2">
                                          <span className="inline-block w-4 h-4 rounded-sm border border-[var(--ds-border)]" style={{ backgroundColor: selectedCacheItem.unsplash.color }} />
                                          <span className="text-[var(--ds-text)] font-mono">{selectedCacheItem.unsplash.color}</span>
                                        </div>
                                      </div>
                                    )}
                                    {(selectedCacheItem.unsplash.locationCity || selectedCacheItem.unsplash.locationCountry) && (
                                      <div>
                                        <p className="text-[var(--ds-text-subtle)]">Aufnahmeort</p>
                                        <p className="text-[var(--ds-text)]">
                                          {[selectedCacheItem.unsplash.locationCity, selectedCacheItem.unsplash.locationCountry].filter(Boolean).join(", ")}
                                        </p>
                                      </div>
                                    )}
                                    {selectedCacheItem.unsplash.likes != null && (
                                      <div>
                                        <p className="text-[var(--ds-text-subtle)]">Likes</p>
                                        <p className="text-[var(--ds-text)]">{selectedCacheItem.unsplash.likes.toLocaleString(locale)}</p>
                                      </div>
                                    )}
                                    {selectedCacheItem.unsplash.createdAtUnsplash && (
                                      <div>
                                        <p className="text-[var(--ds-text-subtle)]">Aufnahmedatum</p>
                                        <p className="text-[var(--ds-text)]">{formatMediaDate(selectedCacheItem.unsplash.createdAtUnsplash, locale)}</p>
                                      </div>
                                    )}
                                  </>
                                )}
                                <div>
                                  <p className="text-[var(--ds-text-subtle)]">{mediaMessages.fileSize}</p>
                                  <p className="text-[var(--ds-text)]">{formatBytes(selectedCacheItem.sizeBytes, locale)}</p>
                                </div>
                                <div>
                                  <p className="text-[var(--ds-text-subtle)]">{mediaMessages.internalUrl}</p>
                                  <div className="mt-1 rounded-control border border-[var(--ds-border)] bg-[var(--ds-input-bg)] px-3 py-2 font-mono text-xs text-[var(--ds-text)] break-all">
                                    {selectedCacheItem.url}
                                  </div>
                                </div>
                              </div>
                              <div className="flex gap-2">
                                <button
                                  type="button"
                                  onClick={async () => { await navigator.clipboard.writeText(selectedCacheItem.url); setCacheCopied(true); }}
                                  className="flex-1 h-9 px-4 border border-[var(--ds-border)] rounded-control text-sm text-[var(--ds-text)] hover:border-[var(--ds-border-strong)] flex items-center justify-center gap-2"
                                >
                                  <CopyIcon weight="duotone" className="w-4 h-4" />
                                  {cacheCopied ? mediaMessages.copied : mediaMessages.copyUrl}
                                </button>
                              </div>
                            </DashboardSection.Body>
                          </DashboardSection>
                        </>
                      ) : (
                        <ContentUnavailableView
                          icon={<ImageIcon weight="duotone" aria-hidden />}
                          title={mediaMessages.previewTitle}
                          subtitle={mediaMessages.selectPrompt}
                          className="min-h-[22rem]"
                        />
                      )}
                    </div>
                  </PageSplitAside>
                </PageSplitLayout>
              );
            })()
          )
        ) : (
          /* ── Root view ─────────────────────────────────────────────── */
          assets.length > 0 ? (
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
                    {/* unsplash/ folder row */}
                    <button
                      type="button"
                      onClick={() => setCurrentFolder("cache")}
                      className="w-full flex items-center gap-3 px-3 py-2.5 border-b border-[var(--ds-border-subtle)] hover:bg-[var(--ds-bg-elevated)] transition-colors text-left"
                    >
                      <FolderIcon weight="duotone" className="w-5 h-5 text-amber-500 shrink-0" />
                      <span className="flex-1 text-sm font-mono text-[var(--ds-text)]">unsplash/</span>
                      <span className="text-xs text-[var(--ds-text-subtle)]">{cacheItems.length > 0 ? `${cacheItems.length} Bilder` : mediaMessages.cacheFolderDescription}</span>
                    </button>
                    <MediaTable assets={assets} selectedId={selectedId} onSelect={setSelectedId} />
                  </div>
                )}

                {!isLoading && viewMode === "grid" && (
                  <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 gap-3">
                    {/* unsplash/ folder tile */}
                    <button
                      type="button"
                      onClick={() => setCurrentFolder("cache")}
                      className="flex flex-col items-center gap-1.5 p-2 rounded-xl transition-colors text-center"
                    >
                      <div className="w-full aspect-square rounded-lg flex flex-col items-center justify-center bg-[var(--ds-bg-elevated)] border-2 border-transparent hover:border-[var(--ds-border)] transition-colors gap-2">
                        <FolderIcon weight="duotone" className="w-16 h-16 text-amber-500" />
                      </div>
                      <div className="w-full px-0.5">
                        <p className="text-xs font-medium text-[var(--ds-text)] font-mono truncate">unsplash/</p>
                        <p className="text-[10px] text-[var(--ds-text-muted)] truncate">{cacheItems.length > 0 ? `${cacheItems.length} Bilder` : mediaMessages.cacheFolderDescription}</p>
                      </div>
                    </button>
                    {assets.map((asset) => (
                      <MediaGridItem
                        key={asset.id}
                        asset={asset}
                        selected={asset.id === selectedId}
                        onSelect={setSelectedId}
                      />
                    ))}
                  </div>
                )}
              </PageSplitMain>

              <PageSplitAside className="self-start xl:sticky xl:top-[4.75rem]">
                {selectedAsset ? (
                  <div className="space-y-3">
                    <DashboardSection>
                      <DashboardSection.Header
                        icon={<ImageIcon weight="duotone" className="w-4 h-4" />}
                        title={mediaMessages.previewTitle}
                      />
                      <DashboardSection.Body>
                        <MediaPreview
                          asset={selectedAsset}
                          unsupportedPreview={mediaMessages.unsupportedPreview}
                        />
                      </DashboardSection.Body>
                    </DashboardSection>

                    <DashboardSection>
                      <DashboardSection.Header
                        icon={<PencilSimpleIcon weight="duotone" className="w-4 h-4" />}
                        title={mediaMessages.detailsTitle}
                      />
                      <DashboardSection.Body>
                        <label className="block space-y-1.5">
                          <span className="text-sm font-medium text-[var(--ds-text)]">
                            {mediaMessages.displayName}
                          </span>
                          <input
                            type="text"
                            value={draftName}
                            onChange={(event) => setDraftName(event.target.value)}
                            className="w-full px-3 py-2.5 border border-[var(--ds-border)] rounded-control text-sm bg-[var(--ds-input-bg)] text-[var(--ds-text)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                          />
                        </label>

                        <label className="block space-y-1.5">
                          <span className="text-sm font-medium text-[var(--ds-text)]">Alias</span>
                          <input
                            type="text"
                            value={draftAlias}
                            onChange={(event) => setDraftAlias(event.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
                            placeholder="z.B. sepa-qr"
                            className="w-full px-3 py-2.5 border border-[var(--ds-border)] rounded-control text-sm font-mono bg-[var(--ds-input-bg)] text-[var(--ds-text)] placeholder:text-[var(--ds-text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                          />
                          <p className="text-xs text-[var(--ds-text-subtle)]">
                            {draftAlias ? `Verwendung: [[image:${draftAlias}]] oder [[pdf:${draftAlias}]]` : "Optional. Erlaubt: a-z, 0-9, Bindestrich."}
                          </p>
                        </label>

                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => void handleSaveMeta()}
                            disabled={
                              renameMedia.isPending ||
                              draftName.trim().length === 0 ||
                              (draftName.trim() === selectedAsset.displayName && (draftAlias.trim() || null) === (selectedAsset.alias ?? null))
                            }
                            className="flex-1 h-9 px-4 border border-[var(--ds-btn-primary-border)] text-[var(--ds-btn-primary-text)] rounded-control text-sm font-medium hover:border-[var(--ds-btn-primary-hover-border)] hover:bg-[var(--ds-btn-primary-hover-bg)] disabled:opacity-60"
                          >
                            {renameMedia.isPending ? common.saving : mediaMessages.saveName}
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeleteTarget(selectedAsset)}
                            className="h-9 px-4 border border-[var(--ds-btn-danger-border)] text-[var(--ds-btn-danger-text)] rounded-control text-sm font-medium hover:border-[var(--ds-btn-danger-hover-border)] hover:bg-[var(--ds-btn-danger-hover-bg)]"
                          >
                            <TrashIcon weight="duotone" className="w-4 h-4" />
                          </button>
                        </div>
                      </DashboardSection.Body>
                    </DashboardSection>

                    <DashboardSection>
                      <DashboardSection.Header
                        icon={<FileIcon weight="duotone" className="w-4 h-4" />}
                        title={mediaMessages.infoTitle}
                      />
                      <DashboardSection.Body>
                        <div className="space-y-3 text-sm">
                          <div>
                            <p className="text-[var(--ds-text-subtle)]">{mediaMessages.originalName}</p>
                            <p className="text-[var(--ds-text)] break-all">{selectedAsset.originalName}</p>
                          </div>
                          <div>
                            <p className="text-[var(--ds-text-subtle)]">{mediaMessages.fileType}</p>
                            <p className="text-[var(--ds-text)]">{selectedAsset.mimeType}</p>
                          </div>
                          <div>
                            <p className="text-[var(--ds-text-subtle)]">{mediaMessages.fileSize}</p>
                            <p className="text-[var(--ds-text)]">{formatBytes(selectedAsset.sizeBytes, locale)}</p>
                          </div>
                          {selectedAsset.width && selectedAsset.height && (
                            <div>
                              <p className="text-[var(--ds-text-subtle)]">{mediaMessages.dimensions}</p>
                              <p className="text-[var(--ds-text)]">{selectedAsset.width} × {selectedAsset.height}px</p>
                            </div>
                          )}
                          <div>
                            <p className="text-[var(--ds-text-subtle)]">{mediaMessages.createdAt}</p>
                            <p className="text-[var(--ds-text)]">{formatMediaDate(selectedAsset.createdAt, locale)}</p>
                          </div>
                          <div>
                            <p className="text-[var(--ds-text-subtle)]">{mediaMessages.updatedAt}</p>
                            <p className="text-[var(--ds-text)]">{formatMediaDate(selectedAsset.updatedAt, locale)}</p>
                          </div>
                          <div>
                            <p className="text-[var(--ds-text-subtle)]">{mediaMessages.uploadedBy}</p>
                            <p className="text-[var(--ds-text)]">{selectedAsset.createdByUsername ?? "—"}</p>
                          </div>
                          <div>
                            <p className="text-[var(--ds-text-subtle)]">{mediaMessages.internalUrl}</p>
                            <div className="mt-1 rounded-control border border-[var(--ds-border)] bg-[var(--ds-input-bg)] px-3 py-2 font-mono text-xs text-[var(--ds-text)] break-all">
                              {selectedAsset.url}
                            </div>
                          </div>
                        </div>

                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => void handleCopyUrl()}
                            className="flex-1 h-9 px-4 border border-[var(--ds-border)] rounded-control text-sm text-[var(--ds-text)] hover:border-[var(--ds-border-strong)] flex items-center justify-center gap-2"
                          >
                            <CopyIcon weight="duotone" className="w-4 h-4" />
                            {copied ? mediaMessages.copied : mediaMessages.copyUrl}
                          </button>
                        </div>
                      </DashboardSection.Body>
                    </DashboardSection>
                  </div>
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
          )
        )}

        {currentFolder === "root" && (
          <div
            aria-hidden={!isDragActive}
            className={`pointer-events-none absolute inset-0 z-10 flex items-center justify-center rounded-[1.25rem] border-2 border-dashed transition-all ${
              isDragActive
                ? "border-[var(--color-primary)] bg-[color-mix(in_srgb,var(--color-primary)_10%,transparent)] opacity-100"
                : "border-transparent bg-transparent opacity-0"
            }`}
          >
            <div className="rounded-2xl border border-[var(--ds-border)] bg-[var(--ds-surface)]/95 px-6 py-5 text-center shadow-lg backdrop-blur-sm">
              <PlusCircleIcon weight="duotone" className="mx-auto mb-3 h-8 w-8 text-[var(--color-primary)]" />
              <p className="text-sm font-medium text-[var(--ds-text)]">{mediaMessages.upload}</p>
              <p className="mt-1 text-xs text-[var(--ds-text-subtle)]">{mediaMessages.uploadHint}</p>
            </div>
          </div>
        )}
      </PageBody>

      {currentFolder === "root" && (
        <PageFooter>
          <span className="text-xs text-[var(--ds-text-subtle)]">{mediaMessages.uploadHint}</span>
        </PageFooter>
      )}

      <Dialog
        open={deleteTarget !== null}
        title={mediaMessages.deleteTitle}
        titleIcon={<TrashIcon weight="duotone" className={dialogHeaderIconClass} />}
        onClose={() => setDeleteTarget(null)}
      >
        <div className="px-6 py-3">
          <p className="text-sm text-[var(--ds-text-muted)]">
            <span className="font-medium">{deleteTarget?.displayName}</span>{" "}
            {mediaMessages.deleteDescription}
          </p>
        </div>
        <Dialog.Footer>
          <button
            type="button"
            onClick={() => setDeleteTarget(null)}
            className={dialogBtnSecondary}
          >
            {common.cancel}
          </button>
          <button
            type="button"
            disabled={deleteMedia.isPending || !deleteTarget}
            onClick={() => {
              if (!deleteTarget) return;
              deleteMedia.mutate(deleteTarget.id, {
                onSuccess: () => {
                  if (selectedId === deleteTarget.id) {
                    setSelectedId(null);
                  }
                  setDeleteTarget(null);
                },
                onError: (error) => {
                  setActionError(error instanceof Error ? error.message : common.unknownError);
                },
              });
            }}
            className={dialogBtnDestructive}
          >
            {deleteMedia.isPending ? "…" : common.delete}
          </button>
        </Dialog.Footer>
      </Dialog>

      <Dialog
        open={showPurgeDialog}
        title={mediaMessages.purgeCacheTitle}
        titleIcon={<TrashIcon weight="duotone" className={dialogHeaderIconClass} />}
        onClose={() => setShowPurgeDialog(false)}
      >
        <div className="px-6 py-3">
          <p className="text-sm text-[var(--ds-text-muted)]">
            {mediaMessages.purgeCacheDescription}
          </p>
        </div>
        <Dialog.Footer>
          <button
            type="button"
            onClick={() => setShowPurgeDialog(false)}
            className={dialogBtnSecondary}
          >
            {common.cancel}
          </button>
          <button
            type="button"
            disabled={purgeCache.isPending}
            onClick={() => {
              purgeCache.mutate(undefined, {
                onSuccess: () => {
                  setShowPurgeDialog(false);
                  setSelectedCacheItemId(null);
                  setSelectedCacheItemType(null);
                  setCacheSubFolder(null);
                },
              });
            }}
            className={dialogBtnDestructive}
          >
            {purgeCache.isPending ? "…" : mediaMessages.purgeCache}
          </button>
        </Dialog.Footer>
      </Dialog>

      <Dialog
        open={deleteCacheTarget !== null}
        title={mediaMessages.deleteCacheItemTitle}
        titleIcon={<TrashIcon weight="duotone" className={dialogHeaderIconClass} />}
        onClose={() => setDeleteCacheTarget(null)}
      >
        <div className="px-6 py-3">
          <p className="text-sm text-[var(--ds-text-muted)]">
            {mediaMessages.deleteCacheItemDescription}
          </p>
        </div>
        <Dialog.Footer>
          <button
            type="button"
            onClick={() => setDeleteCacheTarget(null)}
            className={dialogBtnSecondary}
          >
            {common.cancel}
          </button>
          <button
            type="button"
            disabled={deleteCacheItem.isPending}
            onClick={() => {
              if (!deleteCacheTarget) return;
              deleteCacheItem.mutate(deleteCacheTarget, {
                onSuccess: () => {
                  if (selectedCacheItemId === deleteCacheTarget.unsplashImageId && selectedCacheItemType === deleteCacheTarget.type) {
                    setSelectedCacheItemId(null);
                    setSelectedCacheItemType(null);
                  }
                  setDeleteCacheTarget(null);
                },
              });
            }}
            className={dialogBtnDestructive}
          >
            {deleteCacheItem.isPending ? "…" : common.delete}
          </button>
        </Dialog.Footer>
      </Dialog>
    </PageLayout>
  );
}
