import { type ReactNode, createContext, useContext, useMemo, useState } from "react";

interface PageHeaderContextValue {
  title: string;
  setTitle: (title: string) => void;
  actionsEl: HTMLDivElement | null;
  setActionsEl: (el: HTMLDivElement | null) => void;
}

const PageHeaderContext = createContext<PageHeaderContextValue>({
  title: "",
  setTitle: () => {},
  actionsEl: null,
  setActionsEl: () => {},
});

/**
 * Provides shared page-header state (title + action portal target).
 *
 * @param props - Provider children.
 * @returns Context provider element.
 */
export function PageHeaderProvider({ children }: { children: ReactNode }) {
  const [title, setTitle] = useState("");
  const [actionsEl, setActionsEl] = useState<HTMLDivElement | null>(null);

  const value = useMemo(() => ({ title, setTitle, actionsEl, setActionsEl }), [title, actionsEl]);

  return <PageHeaderContext.Provider value={value}>{children}</PageHeaderContext.Provider>;
}

/**
 * Reads mutable page-header state used by route components.
 *
 * @returns Page header context value.
 */
export function usePageHeaderContext() {
  return useContext(PageHeaderContext);
}
