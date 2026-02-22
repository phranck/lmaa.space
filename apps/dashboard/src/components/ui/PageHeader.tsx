import { usePageHeaderContext } from "@/context/PageHeaderContext.tsx";
import { type ReactNode, useEffect } from "react";
import { createPortal } from "react-dom";

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
  }, [title, setTitle]);

  if (!actionsEl || !children) return null;
  return createPortal(children, actionsEl);
}
