import type {
  MediaBundleUpload,
  MediaBundleUploadFile,
} from "@/features/system/hooks/useAdminMedia.ts";

export interface BrowserFileSystemEntry {
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

export interface DirectoryReadProgress {
  name: string;
  filesRead: number;
  filesTotal: number;
}

export interface DroppedHlsBundleCollection {
  bundles: MediaBundleUpload[];
  directoryCount: number;
  emptyDirectories: string[];
  unsupportedItemCount: number;
}

interface DroppedHlsBundleItemResult {
  bundle: MediaBundleUpload | null;
  directoryCount: number;
  emptyDirectory: string | null;
  unsupportedItemCount: number;
}

export function getFileSystemEntry(item: DataTransferItem): BrowserFileSystemEntry | null {
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

function readAllDirectoryEntries(
  directory: BrowserFileSystemDirectoryEntry,
): Promise<BrowserFileSystemEntry[]> {
  const reader = directory.createReader();
  const entries: BrowserFileSystemEntry[] = [];

  async function readNextBatch(): Promise<BrowserFileSystemEntry[]> {
    const batch = await readDirectoryEntries(reader);
    if (batch.length === 0) return entries;
    entries.push(...batch);
    return readNextBatch();
  }

  return readNextBatch();
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
  let filesRead = 0;

  onProgress?.({ name, filesRead, filesTotal: handles.length });

  return Promise.all(
    handles.map(async (handle) => {
      const file = await readFileEntry(handle.entry);
      filesRead += 1;
      onProgress?.({ name, filesRead, filesTotal: handles.length });
      return { file, relativePath: handle.relativePath };
    }),
  );
}

async function collectDroppedHlsBundleItem(
  item: DataTransferItem,
  onProgress?: (progress: DirectoryReadProgress) => void,
): Promise<DroppedHlsBundleItemResult> {
  const entry = getFileSystemEntry(item);
  if (!entry) {
    return {
      bundle: null,
      directoryCount: 0,
      emptyDirectory: null,
      unsupportedItemCount: 1,
    };
  }

  if (!entry.isDirectory) {
    return {
      bundle: null,
      directoryCount: 0,
      emptyDirectory: null,
      unsupportedItemCount: 0,
    };
  }

  const children = await readAllDirectoryEntries(entry as BrowserFileSystemDirectoryEntry);
  const handles = (await Promise.all(children.map((child) => collectEntryFiles(child, "")))).flat();

  if (handles.length === 0) {
    return {
      bundle: null,
      directoryCount: 1,
      emptyDirectory: entry.name,
      unsupportedItemCount: 0,
    };
  }

  return {
    bundle: { name: entry.name, files: await readBundleFiles(entry.name, handles, onProgress) },
    directoryCount: 1,
    emptyDirectory: null,
    unsupportedItemCount: 0,
  };
}

export async function collectDroppedHlsBundles(
  items: DataTransferItem[],
  onProgress?: (progress: DirectoryReadProgress) => void,
): Promise<DroppedHlsBundleCollection> {
  const results = await Promise.all(
    items.map((item) => collectDroppedHlsBundleItem(item, onProgress)),
  );

  return results.reduce<DroppedHlsBundleCollection>(
    (collection, result) => {
      if (result.bundle) collection.bundles.push(result.bundle);
      if (result.emptyDirectory) collection.emptyDirectories.push(result.emptyDirectory);
      collection.directoryCount += result.directoryCount;
      collection.unsupportedItemCount += result.unsupportedItemCount;
      return collection;
    },
    {
      bundles: [],
      directoryCount: 0,
      emptyDirectories: [],
      unsupportedItemCount: 0,
    },
  );
}
