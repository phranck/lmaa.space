import type React from "react";

type MonochromeIconComponent = React.ElementType;
type MonochromeIconModule = { default: MonochromeIconComponent };

export type MonochromeIconLoader = () => Promise<MonochromeIconModule>;

type BucketModule = {
  monochromeIconLoaders: Record<string, MonochromeIconLoader>;
};

const bucketModules: Record<string, () => Promise<BucketModule>> = {
  A: () => import("@/lib/buttonIconLoaders/A.generated.ts"),
  B: () => import("@/lib/buttonIconLoaders/B.generated.ts"),
  C: () => import("@/lib/buttonIconLoaders/C.generated.ts"),
  D: () => import("@/lib/buttonIconLoaders/D.generated.ts"),
  E: () => import("@/lib/buttonIconLoaders/E.generated.ts"),
  F: () => import("@/lib/buttonIconLoaders/F.generated.ts"),
  G: () => import("@/lib/buttonIconLoaders/G.generated.ts"),
  H: () => import("@/lib/buttonIconLoaders/H.generated.ts"),
  I: () => import("@/lib/buttonIconLoaders/I.generated.ts"),
  K: () => import("@/lib/buttonIconLoaders/K.generated.ts"),
  L: () => import("@/lib/buttonIconLoaders/L.generated.ts"),
  M: () => import("@/lib/buttonIconLoaders/M.generated.ts"),
  N: () => import("@/lib/buttonIconLoaders/N.generated.ts"),
  P: () => import("@/lib/buttonIconLoaders/P.generated.ts"),
  Q: () => import("@/lib/buttonIconLoaders/Q.generated.ts"),
  R: () => import("@/lib/buttonIconLoaders/R.generated.ts"),
  S: () => import("@/lib/buttonIconLoaders/S.generated.ts"),
  T: () => import("@/lib/buttonIconLoaders/T.generated.ts"),
  U: () => import("@/lib/buttonIconLoaders/U.generated.ts"),
  V: () => import("@/lib/buttonIconLoaders/V.generated.ts"),
  W: () => import("@/lib/buttonIconLoaders/W.generated.ts"),
  X: () => import("@/lib/buttonIconLoaders/X.generated.ts"),
};

const bucketCache = new Map<string, Promise<BucketModule>>();

function getBucketKey(name: string) {
  return name.startsWith("SF") && name.length > 2 ? name[2] : null;
}

async function loadBucket(bucketKey: string) {
  const cachedBucket = bucketCache.get(bucketKey);
  if (cachedBucket) {
    return cachedBucket;
  }

  const loadModule = bucketModules[bucketKey];
  if (!loadModule) {
    return null;
  }

  const bucketModule = loadModule();
  bucketCache.set(bucketKey, bucketModule);
  return bucketModule;
}

export async function loadMonochromeIconLoader(name: string): Promise<MonochromeIconLoader | null> {
  const bucketKey = getBucketKey(name);
  if (!bucketKey) {
    return null;
  }

  const bucket = await loadBucket(bucketKey);
  if (!bucket) {
    return null;
  }

  return bucket.monochromeIconLoaders[name] ?? null;
}
