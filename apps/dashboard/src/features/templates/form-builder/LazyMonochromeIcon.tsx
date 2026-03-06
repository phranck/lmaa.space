/// <reference types="vite/client" />

import type React from "react";
import { useEffect, useState } from "react";

type MonochromeIconProps = {
  className?: string;
  width?: number | string;
  height?: number | string;
  size?: number | string;
  title?: string;
  "aria-hidden"?: boolean;
};

type MonochromeIconComponent = React.ComponentType<MonochromeIconProps>;
type MonochromeIconModule = { default: MonochromeIconComponent };

const iconModules = import.meta.glob(
  "../../../../../node_modules/sf-symbols-lib/dist/monochrome/icons/*.js",
) as Record<string, () => Promise<MonochromeIconModule>>;

const iconKeyByName = new Map(
  Object.keys(iconModules).map((key) => [key.slice(key.lastIndexOf("/") + 1, -3), key]),
);

const iconCache = new Map<string, MonochromeIconComponent | null>();
const pendingIconCache = new Map<string, Promise<MonochromeIconComponent | null>>();

async function loadMonochromeIcon(name: string): Promise<MonochromeIconComponent | null> {
  if (!iconKeyByName.has(name)) {
    return null;
  }

  if (iconCache.has(name)) {
    return iconCache.get(name) ?? null;
  }

  const pending = pendingIconCache.get(name);
  if (pending) {
    return pending;
  }

  const key = iconKeyByName.get(name);
  if (!key) {
    return null;
  }

  const loadPromise = iconModules[key]()
    .then((module) => {
      const icon = module.default ?? null;
      iconCache.set(name, icon);
      pendingIconCache.delete(name);
      return icon;
    })
    .catch(() => {
      pendingIconCache.delete(name);
      iconCache.set(name, null);
      return null;
    });

  pendingIconCache.set(name, loadPromise);
  return loadPromise;
}

interface LazyMonochromeIconProps extends MonochromeIconProps {
  name: string;
}

export function LazyMonochromeIcon({ name, ...props }: LazyMonochromeIconProps) {
  const [Icon, setIcon] = useState<MonochromeIconComponent | null>(() => iconCache.get(name) ?? null);

  useEffect(() => {
    let active = true;

    void loadMonochromeIcon(name).then((loadedIcon) => {
      if (active) {
        setIcon(() => loadedIcon);
      }
    });

    return () => {
      active = false;
    };
  }, [name]);

  if (!Icon) {
    return null;
  }

  return <Icon {...props} />;
}
