import { createPortal } from "react-dom";
import { useEffect, type ReactNode } from "react";
import { usePageHeaderContext } from "@/context/PageHeaderContext.tsx";

interface PageHeaderProps {
  title: string;
  children?: ReactNode;
}

/**
 * Injects title and optional action buttons into the fixed dashboard header.
 * Renders nothing in the page content itself.
 */
export function PageHeader({ title, children }: PageHeaderProps) {
  const { setTitle, actionsEl } = usePageHeaderContext();

  useEffect(() => {
    setTitle(title);
    return () => setTitle("");
  }, [title]);

  if (!actionsEl || !children) return null;
  return createPortal(children, actionsEl);
}
