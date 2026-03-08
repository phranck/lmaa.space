import { useEffect, useRef, useState } from "react";
import SFDocumentFill from "sf-symbols-lib/monochrome/SFDocumentFill";
import SFDocumentOnDocumentFill from "sf-symbols-lib/monochrome/SFDocumentOnDocumentFill";
import SFLink from "sf-symbols-lib/monochrome/SFLink";
import SFListBullet from "sf-symbols-lib/monochrome/SFListBullet";
import SFPhotoFill from "sf-symbols-lib/monochrome/SFPhotoFill";
import SFPlusCircleFill from "sf-symbols-lib/monochrome/SFPlusCircleFill";
import SFSquareGrid2x2Fill from "sf-symbols-lib/monochrome/SFSquareGrid2x2Fill";
import SFTrashFill from "sf-symbols-lib/monochrome/SFTrashFill";

import type { MediaAsset } from "@lmaa/shared";

import { Card, SectionCard } from "@/components/ui/Card.tsx";
import { ContentUnavailableView } from "@/components/ui/ContentUnavailableView.tsx";
import {
  Dialog,
  dialogBtnDestructive,
  dialogBtnSecondary,
  dialogHeaderIconClass,
} from "@/components/ui/Dialog.tsx";
import { PageHeader } from "@/components/ui/PageHeader.tsx";
import {
  PageBody,
  PageLayout,
  PageSplitAside,
  PageSplitLayout,
  PageSplitMain,
} from "@/components/ui/PageLayout.tsx";
import { SegmentedControl } from "@/components/ui/SegmentedControl.tsx";
import { Toolbar } from "@/components/ui/Toolbar.tsx";
import { useI18n } from "@/context/I18nContext.tsx";
import { useAuth } from "@/features/auth/AuthContext.tsx";
import { useAdminMedia, useDeleteMedia, useRenameMedia, useUploadMedia } from "@/features/system/hooks/useAdminMedia.ts";
import {
  formatBytes,
  formatMediaDate,
  getMediaTypeLabel,
  isImageAsset,
} from "@/features/system/media/media-utils.ts";
import { MediaGridItem } from "@/features/system/media/MediaGridItem.tsx";
import { MediaTable } from "@/features/system/media/MediaTable.tsx";
import { getSegmentedStorageKey } from "@/lib/segmented-storage.ts";

type ViewMode = "list" | "grid";

function MediaPreview({ asset, unsupportedPreview }: { asset: MediaAsset; unsupportedPreview: string }) {
  if (isImageAsset(asset)) {
    return (
      <div className="aspect-[4/3] rounded-xl overflow-hidden bg-[var(--ds-bg-elevated)]">
        <img src={asset.url} alt="" className="w-full h-full object-cover" />
      </div>
    );
  }

  return (
    <div className="aspect-[4/3] rounded-xl bg-[var(--ds-bg-elevated)] border border-dashed border-[var(--ds-border)] flex flex-col items-center justify-center gap-3 text-[var(--ds-text-subtle)]">
      <SFDocumentFill className="w-12 h-12" />
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
  const [draftName, setDraftName] = useState("");
  const [actionError, setActionError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<MediaAsset | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const { data: assets = [], isLoading } = useAdminMedia();
  const uploadMedia = useUploadMedia();
  const renameMedia = useRenameMedia();
  const deleteMedia = useDeleteMedia();

  const selectedAsset = assets.find((asset) => asset.id === selectedId) ?? null;

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
    setDraftName(selectedAsset?.displayName ?? "");
    setCopied(false);
  }, [selectedAsset]);

  useEffect(() => {
    if (!copied) return;
    const timer = window.setTimeout(() => setCopied(false), 1500);
    return () => window.clearTimeout(timer);
  }, [copied]);

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

  async function handleCopyUrl() {
    if (!selectedAsset) return;
    await navigator.clipboard.writeText(selectedAsset.url);
    setCopied(true);
  }

  async function handleSaveName() {
    if (!selectedAsset) return;

    const nextName = draftName.trim();
    if (!nextName || nextName === selectedAsset.displayName) return;

    setActionError(null);

    try {
      await renameMedia.mutateAsync({ id: selectedAsset.id, displayName: nextName });
    } catch (error) {
      setActionError(error instanceof Error ? error.message : mediaMessages.renameError);
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
            { value: "list", icon: <SFListBullet className="w-4 h-4" /> },
            { value: "grid", icon: <SFSquareGrid2x2Fill className="w-4 h-4" /> },
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
          onClick={() => inputRef.current?.click()}
          disabled={uploadMedia.isPending}
          className="flex items-center gap-2 py-1.5 px-4 border border-[var(--ds-btn-primary-border)] text-[var(--ds-btn-primary-text)] rounded-control text-sm font-medium hover:border-[var(--ds-btn-primary-hover-border)] hover:bg-[var(--ds-btn-primary-hover-bg)] transition-colors disabled:opacity-60"
        >
          <SFPlusCircleFill className="w-3.5 h-3.5" />
          {uploadMedia.isPending ? mediaMessages.uploading : mediaMessages.upload}
        </button>
      </PageHeader>

      {actionError && <p className="text-sm text-red-500 mb-3">{actionError}</p>}

      {assets.length > 0 ? (
        <PageSplitLayout>
          <PageSplitMain>
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
                    className={`bg-[var(--ds-surface)] rounded-card border border-[var(--ds-border-subtle)] animate-pulse ${viewMode === "grid" ? "aspect-[4/3]" : "h-16"}`}
                  />
                ))}
              </div>
            )}

            {!isLoading && viewMode === "list" && (
              <div className="-mx-3 -mt-3">
                <MediaTable assets={assets} selectedId={selectedId} onSelect={setSelectedId} />
              </div>
            )}

            {!isLoading && viewMode === "grid" && (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
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

          <PageSplitAside>
            <Card className="p-4 h-fit xl:sticky xl:top-[4.75rem]">
              {selectedAsset ? (
                <div className="space-y-4">
                  <SectionCard title={mediaMessages.previewTitle}>
                    <MediaPreview asset={selectedAsset} unsupportedPreview={mediaMessages.unsupportedPreview} />
                  </SectionCard>

                  <SectionCard title={mediaMessages.detailsTitle}>
                    <label className="block space-y-1.5">
                      <span className="text-sm font-medium text-[var(--ds-text)]">{mediaMessages.displayName}</span>
                      <input
                        type="text"
                        value={draftName}
                        onChange={(event) => setDraftName(event.target.value)}
                        className="w-full px-3 py-2.5 border border-[var(--ds-border)] rounded-control text-sm bg-[var(--ds-input-bg)] text-[var(--ds-text)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                      />
                    </label>

                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => void handleSaveName()}
                        disabled={
                          renameMedia.isPending ||
                          draftName.trim().length === 0 ||
                          draftName.trim() === selectedAsset.displayName
                        }
                        className="flex-1 h-9 px-4 border border-[var(--ds-btn-primary-border)] text-[var(--ds-btn-primary-text)] rounded-control text-sm font-medium hover:border-[var(--ds-btn-primary-hover-border)] hover:bg-[var(--ds-btn-primary-hover-bg)] transition-colors disabled:opacity-60"
                      >
                        {renameMedia.isPending ? common.saving : mediaMessages.saveName}
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeleteTarget(selectedAsset)}
                        className="h-9 px-4 border border-[var(--ds-btn-danger-border)] text-[var(--ds-btn-danger-text)] rounded-control text-sm font-medium hover:border-[var(--ds-btn-danger-hover-border)] hover:bg-[var(--ds-btn-danger-hover-bg)] transition-colors"
                      >
                        <SFTrashFill className="w-4 h-4" />
                      </button>
                    </div>
                  </SectionCard>

                  <SectionCard title={mediaMessages.infoTitle}>
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
                        className="flex-1 h-9 px-4 border border-[var(--ds-border)] rounded-control text-sm text-[var(--ds-text)] hover:border-[var(--ds-border-strong)] transition-colors flex items-center justify-center gap-2"
                      >
                        <SFDocumentOnDocumentFill className="w-4 h-4" />
                        {copied ? mediaMessages.copied : mediaMessages.copyUrl}
                      </button>
                      <a
                        href={selectedAsset.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-1 h-9 px-4 border border-[var(--ds-border)] rounded-control text-sm text-[var(--ds-text)] hover:border-[var(--ds-border-strong)] transition-colors flex items-center justify-center gap-2"
                      >
                        <SFLink className="w-4 h-4" />
                        {mediaMessages.openFile}
                      </a>
                    </div>
                  </SectionCard>
                </div>
              ) : (
                <ContentUnavailableView
                  icon={<SFDocumentFill aria-hidden />}
                  title={mediaMessages.detailsTitle}
                  subtitle={mediaMessages.selectPrompt}
                  className="flex-1 min-h-[22rem]"
                />
              )}
            </Card>
          </PageSplitAside>
        </PageSplitLayout>
      ) : (
        <PageBody>
          {!isLoading && (
            <ContentUnavailableView
              icon={<SFPhotoFill aria-hidden />}
              title={mediaMessages.empty}
              subtitle={mediaMessages.emptyHint}
              className="flex-1 min-h-0"
            />
          )}
        </PageBody>
      )}

      <Toolbar className="mt-4 text-xs text-[var(--ds-text-subtle)]">
        <span>{mediaMessages.uploadHint}</span>
      </Toolbar>

      <Dialog
        open={deleteTarget !== null}
        title={mediaMessages.deleteTitle}
        titleIcon={<SFTrashFill className={dialogHeaderIconClass} />}
        onClose={() => setDeleteTarget(null)}
      >
        <div className="px-6 py-3">
          <p className="text-sm text-[var(--ds-text-muted)]">
            <span className="font-medium">{deleteTarget?.displayName}</span> {mediaMessages.deleteDescription}
          </p>
        </div>
        <Dialog.Footer>
          <button type="button" onClick={() => setDeleteTarget(null)} className={dialogBtnSecondary}>
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
    </PageLayout>
  );
}
