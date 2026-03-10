import { useEffect, useState } from "react";

import {
  monochromeIconLoaders,
  type MonochromeIconComponent,
} from "@/features/templates/form-builder/buttonIconLoaders.generated.ts";

type MonochromeIconProps = {
  className?: string;
  width?: number | string;
  height?: number | string;
  size?: number | string;
  title?: string;
  "aria-hidden"?: boolean;
};
const monochromeIconCache = new Map<string, MonochromeIconComponent | null>();

function getMonochromeIconLoader(name: string) {
  return monochromeIconLoaders[name] ?? null;
}

async function loadMonochromeIcon(name: string): Promise<MonochromeIconComponent | null> {
  if (monochromeIconCache.has(name)) {
    return monochromeIconCache.get(name) ?? null;
  }

  const loader = getMonochromeIconLoader(name);
  if (!loader) {
    monochromeIconCache.set(name, null);
    return null;
  }

  const module = await loader();
  const Icon = module.default ?? null;
  monochromeIconCache.set(name, Icon);
  return Icon;
}

interface LazyMonochromeIconProps extends MonochromeIconProps {
  name: string;
}

export function LazyMonochromeIcon({ name, ...props }: LazyMonochromeIconProps) {
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
