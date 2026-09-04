import { describe, expect, it } from "vitest";

import {
  editorHeightKey,
  readStoredEditorHeight,
  shouldStoreEditorHeight,
} from "./markdown-editor-height.js";

describe("where a height is stored", () => {
  it("keys on the editor's own id, so two editors keep two heights", () => {
    expect(editorHeightKey("sef-description")).toBe("lmaa.markdown-editor.height.sef-description");
    expect(editorHeightKey("prompt-content")).not.toBe(editorHeightKey("sef-description"));
  });

  it("stores nothing for an editor that cannot be told apart from another", () => {
    expect(editorHeightKey(undefined)).toBeNull();
    expect(editorHeightKey("")).toBeNull();
  });
});

describe("reading a stored height back", () => {
  it("gives a CSS length", () => {
    expect(readStoredEditorHeight("420")).toBe("420px");
  });

  it("rounds to the pixel, because half a pixel is not a height somebody chose", () => {
    expect(readStoredEditorHeight("420.6")).toBe("421px");
  });

  it("answers nothing where nothing was stored", () => {
    expect(readStoredEditorHeight(null)).toBeNull();
    expect(readStoredEditorHeight("")).toBeNull();
  });

  it("discards what is not a number, rather than starting at NaN", () => {
    expect(readStoredEditorHeight("tall")).toBeNull();
  });

  it("discards a height too small to write in", () => {
    // Two lines and the footer is the floor. Below it the value is far more
    // likely a stray drag than a decision, and clamping would present it as one.
    expect(readStoredEditorHeight("20")).toBeNull();
  });

  it("discards a height past any screen", () => {
    expect(readStoredEditorHeight("99999")).toBeNull();
  });
});

describe("deciding whether to write", () => {
  it("writes a height that differs from what stands there", () => {
    expect(shouldStoreEditorHeight(500, "420")).toBe(true);
  });

  it("writes the first height, where nothing stands there yet", () => {
    expect(shouldStoreEditorHeight(500, null)).toBe(true);
  });

  it("does not write the same height again", () => {
    // A drag reports continuously and storage is synchronous, so the question
    // is asked before every write.
    expect(shouldStoreEditorHeight(420, "420")).toBe(false);
  });

  it("treats a sub-pixel difference as no difference", () => {
    // An unrounded measurement differs on every callback, which would make the
    // question always answer yes.
    expect(shouldStoreEditorHeight(420.4, "420")).toBe(false);
  });

  it("refuses a height outside the bounds, so nothing unusable is stored", () => {
    expect(shouldStoreEditorHeight(20, null)).toBe(false);
    expect(shouldStoreEditorHeight(99_999, null)).toBe(false);
    expect(shouldStoreEditorHeight(Number.NaN, null)).toBe(false);
  });
});
