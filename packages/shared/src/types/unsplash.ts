/** Metadata for an Unsplash image stored in the `unsplash_images` table. */
export interface UnsplashImageMeta {
  id: number;
  unsplashId: string;
  urlSmall: string;
  urlRegular: string;
  width: number | null;
  height: number | null;
  color: string | null;
  blurHash: string | null;
  description: string | null;
  altDescription: string | null;
  likes: number | null;
  photographerName: string;
  photographerUrl: string;
  downloadLocation: string;
  locationCity: string | null;
  locationCountry: string | null;
  locationLat: number | null;
  locationLng: number | null;
  locationFetched: boolean;
  createdAtUnsplash: string | null;
  createdAt: string;
}
