import { type ReactElement, useCallback, useRef } from "react";

import { MEDIA_UPLOAD_ACCEPT } from "@lmaa/shared";

interface UseMediaFilePickerOptions {
  onFiles: (files: FileList | null) => void;
}

interface UseMediaFilePickerResult {
  open: () => void;
  hiddenInput: ReactElement;
}

/**
 * Owns a hidden `<input type="file" multiple>` configured with the media
 * accept list. Returns an `open()` trigger plus the input element to render
 * once anywhere in the tree. Used by the header upload button and by the
 * empty-area context menu "Add Assets…" action so both share one DOM input.
 */
export function useMediaFilePicker({
  onFiles,
}: UseMediaFilePickerOptions): UseMediaFilePickerResult {
  const inputRef = useRef<HTMLInputElement>(null);

  const open = useCallback(() => {
    inputRef.current?.click();
  }, []);

  const hiddenInput = (
    <input
      ref={inputRef}
      type="file"
      aria-label="Media files"
      multiple
      className="hidden"
      accept={MEDIA_UPLOAD_ACCEPT}
      onChange={(event) => {
        onFiles(event.target.files);
        event.currentTarget.value = "";
      }}
    />
  );

  return { open, hiddenInput };
}
