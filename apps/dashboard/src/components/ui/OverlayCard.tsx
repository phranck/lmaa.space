import { OverlayCard as BaseOverlayCard, type OverlayCardProps } from "@lmaa/ui/overlay-card";

import { useAuth } from "@/features/auth/AuthContext.tsx";
import { getSegmentedStorageKey } from "@/lib/segmented-storage.ts";

/**
 * The shared overlay card, with the size of a resizable card kept per user.
 *
 * The card itself lives in `@lmaa/ui`. The dashboard adds only the scoping of
 * the storage key, because which user is signed in is something the package
 * does not know, and two people sharing a browser should each find their own
 * size.
 */
export function OverlayCard({ size, ...props }: OverlayCardProps) {
  const { user } = useAuth();
  const scopedSize =
    typeof size === "object"
      ? { ...size, storageKey: getSegmentedStorageKey(user?.id, size.storageKey) }
      : size;
  return <BaseOverlayCard {...props} size={scopedSize} />;
}

OverlayCard.Header = BaseOverlayCard.Header;
OverlayCard.Footer = BaseOverlayCard.Footer;
OverlayCard.Body = BaseOverlayCard.Body;
