import { CaretRightIcon } from "@phosphor-icons/react";
import { Link } from "react-router";

import type { MediaFolder } from "@lmaa/shared";

import { useI18n } from "@/context/I18nContext.tsx";
import { MEDIA_ROOT_PATH, mediaFolderHref } from "@/features/system/media/media-routes.ts";

interface MediaBreadcrumbProps {
  ancestors: MediaFolder[];
  current: MediaFolder | null;
}

const itemClass =
  "max-w-[16rem] truncate font-serif text-lg font-semibold text-[var(--ds-text-muted)] hover:text-[var(--ds-text)]";
const currentClass =
  "max-w-[16rem] truncate font-serif text-lg font-semibold text-[var(--ds-text)]";
const separatorClass = "size-4 text-[var(--ds-text-muted)]";

/**
 * Renders `Media › Folder A › Folder B › Current` in the page header.
 * First crumb links to root, intermediates to their folder route, last crumb
 * is unstyled text. Long names truncate per crumb via CSS.
 */
export function MediaBreadcrumb({ ancestors, current }: MediaBreadcrumbProps) {
  const { messages } = useI18n();
  const rootLabel = messages.media.folders.breadcrumbRoot;
  const trail = current ? [...ancestors, current] : ancestors;

  return (
    <nav className="flex min-w-0 items-center gap-1.5" aria-label="Breadcrumb">
      {current === null ? (
        <span className={currentClass}>{rootLabel}</span>
      ) : (
        <Link to={MEDIA_ROOT_PATH} className={itemClass} title={rootLabel}>
          {rootLabel}
        </Link>
      )}
      {trail.map((folder, index) => {
        const isLast = index === trail.length - 1 && current !== null && folder.id === current.id;
        return (
          <span key={folder.id} className="flex min-w-0 items-center gap-1.5">
            <CaretRightIcon weight="bold" className={separatorClass} aria-hidden />
            {isLast ? (
              <span className={currentClass} title={folder.name}>
                {folder.name}
              </span>
            ) : (
              <Link to={mediaFolderHref(folder)} className={itemClass} title={folder.name}>
                {folder.name}
              </Link>
            )}
          </span>
        );
      })}
    </nav>
  );
}
