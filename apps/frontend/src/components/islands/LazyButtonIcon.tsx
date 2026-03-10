import type React from "react";
import { useEffect, useState } from "react";

import {
  loadMonochromeIconLoader,
  type MonochromeIconLoader,
} from "@/lib/buttonIconLoaders.ts";

type ButtonIconProps = {
  className?: string;
  width?: number | string;
  height?: number | string;
  size?: number | string;
  title?: string;
  "aria-hidden"?: boolean;
};

type MonochromeIconComponent = React.ElementType;

const monochromeIconCache = new Map<string, MonochromeIconComponent | null>();

async function loadMonochromeIcon(name: string): Promise<MonochromeIconComponent | null> {
  if (monochromeIconCache.has(name)) {
    return monochromeIconCache.get(name) ?? null;
  }

  const loader: MonochromeIconLoader | null = await loadMonochromeIconLoader(name);
  if (!loader) {
    monochromeIconCache.set(name, null);
    return null;
  }

  const module = await loader();
  const Icon = module.default ?? null;
  monochromeIconCache.set(name, Icon);
  return Icon;
}

interface LazyButtonIconProps extends ButtonIconProps {
  name: string;
}

export default function LazyButtonIcon({ name, ...props }: LazyButtonIconProps) {
  const [Icon, setIcon] = useState<MonochromeIconComponent | null>(() =>
    monochromeIconCache.get(name) ?? null,
  );

  useEffect(() => {
    let cancelled = false;

    void loadMonochromeIcon(name).then((loadedIcon) => {
      if (!cancelled) {
        setIcon(() => loadedIcon);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [name]);

  if (!Icon) {
    return null;
  }

  return <Icon {...props} />;
}
