import { type ReactNode, useEffect } from "react";
import { createPortal } from "react-dom";

import { usePageHeaderContext } from "@/context/PageHeaderContext.tsx";

interface PageHeaderProps {
  title: string;
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
export function PageHeader({ title, children }: PageHeaderProps) {
  const { setTitle, actionsEl } = usePageHeaderContext();

  useEffect(() => {
    setTitle(title);
    return () => setTitle("");
  }, [title, setTitle]);

  if (!actionsEl || !children) return null;
  return createPortal(children, actionsEl);
}
