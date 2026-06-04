import { XCircleIcon } from "@phosphor-icons/react";
import type {
  DragEvent as ReactDragEvent,
  KeyboardEvent as ReactKeyboardEvent,
  MouseEvent as ReactMouseEvent,
  ReactNode,
} from "react";

import type { MediaAsset } from "@lmaa/shared";
import { formHelpClass as fieldHelpClass } from "@lmaa/ui/form-primitives";

import { useI18n } from "@/context/I18nContext.tsx";
import { formatBytes, stripFileExtension } from "@/features/system/media/media-utils.ts";
import { MediaAssetPreview } from "@/features/system/media/MediaAssetPreview.tsx";

export const mediaGridItemInsetClass = "p-[3px]";
export const mediaGridItemOuterRadiusClass = "rounded-[var(--tile-radius,var(--radius-card))]";
export const mediaGridItemPreviewRadiusClass =
  "rounded-[var(--tile-radius-inner,calc(var(--radius-card)-3px))]";

/**
 * Props for {@link MediaGridItem}.
 *
 * @property asset - Asset to display in the tile.
 * @property selected - Whether the tile is currently selected; drives the
 *   primary-coloured border and label colour.
 * @property onSelect - Invoked on click / Enter / Space with the original
 *   event so callers can read modifier keys (`shift`, `meta`, `ctrl`) for
 *   range or additive selection.
 * @property disabled - Tile is greyed out and does not respond to input;
 *   useful in the asset browser when an asset is already linked.
 * @property disabledTitle - Tooltip shown when `disabled` is true.
 * @property showText - When false the label and caption rows are hidden,
 *   reducing the tile to its preview square.
 * @property label - Override the auto-derived display name (without
 *   extension). Used by content document tiles to show the asset alias.
 * @property caption - Override the auto-derived size caption. Pass `null` to
 *   hide the caption row entirely.
 * @property title - Native HTML `title` attribute on the button.
 * @property draggable - Enables HTML5 drag-and-drop on the tile wrapper.
 * @property onDragStart - Fired when the user starts dragging the tile.
 * @property onContextMenu - Fired on right-click; receives the original
 *   event so callers can read the cursor position. When omitted, the
 *   browser default menu is shown.
 * @property onRemove - When provided, a small corner X button is rendered
 *   that calls back without interfering with selection.
 * @property removeLabel - Accessible label for the corner X button.
 */
interface MediaGridItemProps {
  asset: MediaAsset;
  selected: boolean;
  onSelect: (
    id: number,
    event: ReactMouseEvent<HTMLElement> | ReactKeyboardEvent<HTMLElement>,
  ) => void;
  disabled?: boolean;
  disabledTitle?: string;
  showText?: boolean;
  label?: string;
  caption?: ReactNode;
  title?: string;
  draggable?: boolean;
  onDragStart?: (event: ReactDragEvent<HTMLElement>) => void;
  onContextMenu?: (event: ReactMouseEvent<HTMLElement>, assetId: number) => void;
  onRemove?: () => void;
  removeLabel?: string;
}

/**
 * Shared media tile used by the Asset Manager, Asset Browser and the content
 * sidebar's document grid.
 *
 * Structure is split so the tile remains a native `<button>` (keeping native
 * focus-on-click and Enter/Space handling) while the corner remove button
 * sits next to it as a sibling — nested buttons would be invalid HTML and
 * break event handling. The outer wrapper provides `position: relative` so
 * the remove button can overlap the corner, and acts as the draggable
 * ancestor so HTML5 drag works regardless of where the user grabs the tile.
 *
 * The label wraps anywhere via `[overflow-wrap:anywhere]`, which is necessary
 * for hyphenated content asset aliases such as `gimli-bassreflex-tube-md`.
 */

export function MediaGridItem({
  asset,
  selected,
  onSelect,
  disabled = false,
  disabledTitle,
  showText = true,
  label,
  caption,
  title,
  draggable,
  onDragStart,
  onContextMenu,
  onRemove,
  removeLabel,
}: MediaGridItemProps) {
  const { locale } = useI18n();

  const resolvedLabel = label ?? stripFileExtension(asset.displayName);
  const resolvedCaption = caption === undefined ? formatBytes(asset.sizeBytes, locale) : caption;
  const resolvedTitle = disabled ? disabledTitle : title;

  return (
    <div
      className={`group relative ${mediaGridItemOuterRadiusClass} ${
        disabled ? "cursor-not-allowed opacity-50" : ""
      }`}
    >
      <button
        type="button"
        data-media-asset-item
        data-media-asset-id={asset.id}
        aria-pressed={selected}
        disabled={disabled}
        draggable={draggable && !disabled ? true : undefined}
        onClick={disabled ? undefined : (event) => onSelect(asset.id, event)}
        onContextMenu={
          onContextMenu && !disabled ? (event) => onContextMenu(event, asset.id) : undefined
        }
        onDragStart={draggable && !disabled ? onDragStart : undefined}
        title={resolvedTitle}
        className={`flex w-full flex-col items-center gap-1.5 ${mediaGridItemOuterRadiusClass} text-center transition-colors select-none focus:outline-none ${
          disabled
            ? "cursor-not-allowed"
            : draggable
              ? "cursor-grab active:cursor-grabbing"
              : "cursor-pointer"
        }`}
      >
        <div
          className={`w-full aspect-square ${mediaGridItemInsetClass} ${mediaGridItemOuterRadiusClass} border-2 bg-[var(--ds-bg-elevated)] transition-colors ${
            selected
              ? "border-[var(--color-primary)]"
              : "border-transparent group-hover:border-[var(--ds-border)] group-focus-within:border-[var(--color-primary)]"
          }`}
        >
          <MediaAssetPreview
            asset={asset}
            alt=""
            variant="grid"
            className={mediaGridItemPreviewRadiusClass}
          />
        </div>
        {showText && (
          <div className="w-full px-0.5">
            <p
              className={`text-xs font-medium [overflow-wrap:anywhere] ${selected ? "text-[var(--color-primary)]" : "text-[var(--ds-text)]"}`}
            >
              {resolvedLabel}
            </p>
            {resolvedCaption !== null && resolvedCaption !== undefined && (
              <span
                className={`${fieldHelpClass} block [overflow-wrap:anywhere] text-[10px] text-[var(--ds-text-muted)]`}
              >
                {resolvedCaption}
              </span>
            )}
          </div>
        )}
      </button>

      {onRemove && !disabled && (
        <button
          type="button"
          aria-label={removeLabel}
          title={removeLabel}
          onClick={(event) => {
            event.stopPropagation();
            onRemove();
          }}
          onPointerDown={(event) => event.stopPropagation()}
          className="absolute -right-[5px] -top-[5px] z-10 inline-flex text-[var(--ds-danger-text)] opacity-0 transition-opacity focus:opacity-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ds-focus-ring)] group-hover:opacity-100 rounded-full"
        >
          <span aria-hidden className="absolute -inset-[0.25px] rounded-full bg-white" />
          <XCircleIcon weight="fill" className="size-[26px] relative" />
        </button>
      )}
    </div>
  );
}
