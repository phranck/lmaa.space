import type { MediaFolderColor } from "@lmaa/shared";

import {
  MEDIA_FOLDER_COLOR_OPTIONS,
  MEDIA_FOLDER_COLOR_VALUES,
  MEDIA_FOLDER_DEFAULT_COLOR,
} from "@/features/system/media/MediaFolderColors.ts";

interface MediaFolderColorPickerProps {
  className?: string;
  color: MediaFolderColor | null;
  label: string;
  labels: Record<MediaFolderColor, string>;
  menuItems?: boolean;
  onChange: (color: MediaFolderColor) => void;
  onClose?: () => void;
}

export function MediaFolderColorPicker({
  className = "px-3 py-2",
  color,
  label,
  labels,
  menuItems = false,
  onChange,
  onClose,
}: MediaFolderColorPickerProps) {
  const resolvedFolderColor = color ?? MEDIA_FOLDER_DEFAULT_COLOR;

  return (
    <fieldset className={`border-0 ${className}`}>
      <legend className="sr-only">{label}</legend>
      <div className="flex items-center justify-center gap-2">
        {MEDIA_FOLDER_COLOR_OPTIONS.map((option) => {
          const selected = resolvedFolderColor === option;
          return (
            <button
              key={option}
              type="button"
              data-menu-item={menuItems ? "true" : undefined}
              tabIndex={menuItems ? -1 : undefined}
              aria-label={labels[option]}
              aria-pressed={selected}
              className={`size-4 rounded-full border transition-transform focus:outline-none focus:ring-2 focus:ring-[var(--ds-focus-ring)] hover:scale-110 ${
                selected
                  ? "border-white ring-2 ring-[var(--ds-border-focus)]"
                  : "border-[rgba(255,255,255,0.35)]"
              }`}
              style={{ backgroundColor: MEDIA_FOLDER_COLOR_VALUES[option] }}
              onClick={() => {
                onChange(option);
                onClose?.();
              }}
              onMouseEnter={(event) => event.currentTarget.focus()}
            />
          );
        })}
      </div>
    </fieldset>
  );
}
