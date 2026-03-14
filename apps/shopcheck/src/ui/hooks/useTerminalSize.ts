import { useEffect, useState } from "react";

export function useTerminalSize(): { cols: number; rows: number } {
  const get = () => ({
    cols: Math.max(40, process.stdout.columns ?? 120),
    rows: Math.max(14, process.stdout.rows ?? 30),
  });

  const [size, setSize] = useState(get);

  useEffect(() => {
    const onResize = () => setSize(get());
    process.stdout.on("resize", onResize);
    return () => {
      process.stdout.off("resize", onResize);
    };
  }, []);

  return size;
}

