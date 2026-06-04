import type { MediaAsset } from "@lmaa/shared";

import { MediaAssetPreview } from "@/features/system/media/MediaAssetPreview.tsx";

interface MediaPreviewProps {
  asset: MediaAsset;
  unsupportedPreview: string;
}

export function MediaPreview({ asset, unsupportedPreview }: MediaPreviewProps) {
  return (
    <MediaAssetPreview
      asset={asset}
      alt=""
      variant="detail"
      unsupportedPreview={unsupportedPreview}
    />
  );
}
