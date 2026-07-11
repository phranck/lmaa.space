import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/features/auth/AuthContext.tsx", () => ({
  useAuth: () => ({ user: null }),
}));

import { observePersistedElementHeightById } from "./usePersistedTextareaHeight.ts";

class MockResizeObserver {
  static instances: MockResizeObserver[] = [];

  private readonly callback: ResizeObserverCallback;
  readonly disconnect = vi.fn();
  readonly observe = vi.fn();

  constructor(callback: ResizeObserverCallback) {
    this.callback = callback;
    MockResizeObserver.instances.push(this);
  }

  emitHeight(height: number) {
    this.callback(
      [{ borderBoxSize: [{ blockSize: height }] }] as unknown as ResizeObserverEntry[],
      this as unknown as ResizeObserver,
    );
  }
}

class MockMutationObserver {
  static instances: MockMutationObserver[] = [];

  private readonly callback: MutationCallback;
  readonly disconnect = vi.fn();
  readonly observe = vi.fn();

  constructor(callback: MutationCallback) {
    this.callback = callback;
    MockMutationObserver.instances.push(this);
  }

  emit() {
    this.callback([], this as unknown as MutationObserver);
  }
}

function installLocalStorage() {
  const store = new Map<string, string>();
  vi.stubGlobal("localStorage", {
    getItem: vi.fn((key: string) => store.get(key) ?? null),
    setItem: vi.fn((key: string, value: string) => {
      store.set(key, value);
    }),
  });
}

function installDocument(elements: Map<string, HTMLElement>) {
  const body = {} as HTMLElement;
  vi.stubGlobal("document", {
    body,
    getElementById: vi.fn((id: string) => elements.get(id) ?? null),
  });
  return body;
}

describe("observePersistedElementHeightById", () => {
  beforeEach(() => {
    vi.unstubAllGlobals();
    MockResizeObserver.instances = [];
    MockMutationObserver.instances = [];
    vi.stubGlobal("ResizeObserver", MockResizeObserver);
    vi.stubGlobal("MutationObserver", MockMutationObserver);
    installLocalStorage();
  });

  it("restores the saved height when the editor container mounts after a fallback", () => {
    const storageKey = "user:42:shops:textarea:reject-note";
    localStorage.setItem(storageKey, JSON.stringify(216));
    const elements = new Map<string, HTMLElement>();
    const body = installDocument(elements);

    const disconnect = observePersistedElementHeightById("reject-note", storageKey);

    expect(MockMutationObserver.instances[0]?.observe).toHaveBeenCalledWith(body, {
      childList: true,
      subtree: true,
    });

    const editorContainer = { parentElement: body, style: {} } as HTMLElement;
    elements.set("reject-note", editorContainer);
    MockMutationObserver.instances[0]?.emit();

    expect(editorContainer.style.height).toBe("216px");
    expect(MockResizeObserver.instances[0]?.observe).toHaveBeenCalledWith(editorContainer);

    disconnect();
    expect(MockResizeObserver.instances[0]?.disconnect).toHaveBeenCalledOnce();
  });

  it("stores a resized editor container height", () => {
    const storageKey = "user:42:shops:textarea:reject-long";
    const body = {} as HTMLElement;
    const editorContainer = { parentElement: body, style: {} } as HTMLElement;
    const elements = new Map([["reject-long", editorContainer]]);
    installDocument(elements);

    observePersistedElementHeightById("reject-long", storageKey);
    MockResizeObserver.instances[0]?.emitHeight(312);

    expect(localStorage.getItem(storageKey)).toBe(JSON.stringify(312));
  });

  it("re-attaches when the loaded editor replaces its fallback container", () => {
    const storageKey = "user:42:shops:textarea:reject-note";
    const body = {} as HTMLElement;
    const fallbackContainer = { parentElement: body, style: {} } as HTMLElement;
    const elements = new Map([["reject-note", fallbackContainer]]);
    installDocument(elements);

    observePersistedElementHeightById("reject-note", storageKey);

    const editorContainer = { parentElement: body, style: {} } as HTMLElement;
    elements.set("reject-note", editorContainer);
    MockMutationObserver.instances[0]?.emit();

    expect(MockResizeObserver.instances[0]?.disconnect).toHaveBeenCalledOnce();
    expect(MockResizeObserver.instances[1]?.observe).toHaveBeenCalledWith(editorContainer);
  });
});
