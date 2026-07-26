import { type ReactNode, createContext, use, useMemo, useState } from "react";

interface PageFooterContextValue {
  actionsEl: HTMLDivElement | null;
  setActionsEl: (el: HTMLDivElement | null) => void;
}

const PageFooterContext = createContext<PageFooterContextValue>({
  actionsEl: null,
  setActionsEl: () => {},
});

export function PageFooterProvider({ children }: { children: ReactNode }) {
  const [actionsEl, setActionsEl] = useState<HTMLDivElement | null>(null);

  const value = useMemo(() => ({ actionsEl, setActionsEl }), [actionsEl]);

  return <PageFooterContext.Provider value={value}>{children}</PageFooterContext.Provider>;
}

export function usePageFooterContext() {
  return use(PageFooterContext);
}
