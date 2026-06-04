import { type CSSProperties, useCallback, useMemo, useState } from "react";

const TILE_SIZE_MIN = 64;
const TILE_SIZE_MAX = 200;
const TILE_SIZE_DEFAULT = 120;
const TILE_SIZE_TEXT_THRESHOLD = 100;
const TILE_RADIUS_RATIO = 0.14;
const TILE_RADIUS_MIN = 6;
const TILE_RADIUS_MAX = 22;
const TILE_PADDING_PX = 3;

interface UseTileSizeOptions {
  storageKey: string;
  min?: number;
  max?: number;
  defaultSize?: number;
  textThreshold?: number;
}

interface UseTileSizeResult {
  tileSize: number;
  setTileSize: (next: number) => void;
  showText: boolean;
  gridStyle: CSSProperties;
  bounds: { min: number; max: number };
}

function readStored(storageKey: string, fallback: number, min: number, max: number): number {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(storageKey);
    if (!raw) return fallback;
    const value = Number.parseInt(raw, 10);
    return Number.isFinite(value) && value >= min && value <= max ? value : fallback;
  } catch {
    return fallback;
  }
}

export function useTileSize({
  storageKey,
  min = TILE_SIZE_MIN,
  max = TILE_SIZE_MAX,
  defaultSize = TILE_SIZE_DEFAULT,
  textThreshold = TILE_SIZE_TEXT_THRESHOLD,
}: UseTileSizeOptions): UseTileSizeResult {
  const [tileSize, setTileSizeState] = useState<number>(() =>
    readStored(storageKey, defaultSize, min, max),
  );

  const setTileSize = useCallback(
    (next: number) => {
      const clamped = Math.min(max, Math.max(min, next));
      setTileSizeState(clamped);
      if (typeof window === "undefined") return;
      try {
        window.localStorage.setItem(storageKey, String(clamped));
      } catch {
        // Persistence is best-effort.
      }
    },
    [storageKey, min, max],
  );

  const gridStyle = useMemo<CSSProperties>(() => {
    const radius = Math.max(
      TILE_RADIUS_MIN,
      Math.min(TILE_RADIUS_MAX, tileSize * TILE_RADIUS_RATIO),
    );
    const innerRadius = Math.max(0, radius - TILE_PADDING_PX);
    return {
      gridTemplateColumns: `repeat(auto-fill, ${tileSize}px)`,
      justifyContent: "start",
      "--tile-radius": `${radius}px`,
      "--tile-radius-inner": `${innerRadius}px`,
    } as CSSProperties;
  }, [tileSize]);

  return {
    tileSize,
    setTileSize,
    showText: tileSize >= textThreshold,
    gridStyle,
    bounds: { min, max },
  };
}
