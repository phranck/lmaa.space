import { type ReactNode, useEffect } from "react";
import { createPortal } from "react-dom";

import { usePageHeaderContext } from "@/context/PageHeaderContext.tsx";

interface PageHeaderProps {
  title: string;
  leading?: ReactNode;
  children?: ReactNode;
}

/**
 * Injects title and optional action buttons into the fixed dashboard header.
 * Renders nothing in the page content itself.
 */
/**
 * Standard page header used across dashboard feature pages.
 *
 * @param props - Title and optional right-aligned action content.
 * @returns Consistent page heading row.
 */
export function PageHeader({ title, leading, children }: PageHeaderProps) {
  const { setTitle, leadingEl, actionsEl } = usePageHeaderContext();

  useEffect(() => {
    setTitle(title);
    return () => setTitle("");
  }, [title, setTitle]);

  if (!leadingEl && !actionsEl) return null;

  return (
    <>
      {leadingEl && leading ? createPortal(leading, leadingEl) : null}
      {actionsEl && children ? createPortal(children, actionsEl) : null}
    </>
  );
}
