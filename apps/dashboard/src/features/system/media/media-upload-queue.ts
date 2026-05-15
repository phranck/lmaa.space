export interface MediaUploadQueueResult<T> {
  cancelled: boolean;
  last: T | null;
}

export async function processMediaUploadQueue<TItem, TResult>(
  items: TItem[],
  uploadItem: (item: TItem) => Promise<TResult | null>,
  index = 0,
  last: TResult | null = null,
): Promise<MediaUploadQueueResult<TResult>> {
  if (index >= items.length) {
    return { cancelled: false, last };
  }

  const uploaded = await uploadItem(items[index]);
  if (!uploaded) {
    return { cancelled: true, last };
  }

  return processMediaUploadQueue(items, uploadItem, index + 1, uploaded);
}
