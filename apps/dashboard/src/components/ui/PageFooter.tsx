import type { ReactNode } from "react";
import { createPortal } from "react-dom";

import { usePageFooterContext } from "@/context/PageFooterContext.tsx";

interface PageFooterProps {
  children: ReactNode;
}

export function PageFooter({ children }: PageFooterProps) {
  const { actionsEl } = usePageFooterContext();
  if (!actionsEl) return null;
  return createPortal(children, actionsEl);
}
