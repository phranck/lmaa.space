import { type ReactNode, createContext, useContext, useMemo, useState } from "react";

interface TitleState {
  title: string;
  titleContent: ReactNode | null;
}

interface PageHeaderContextValue {
  title: string;
  titleContent: ReactNode | null;
  setTitleState: (state: TitleState) => void;
  leadingEl: HTMLDivElement | null;
  setLeadingEl: (el: HTMLDivElement | null) => void;
  actionsEl: HTMLDivElement | null;
  setActionsEl: (el: HTMLDivElement | null) => void;
}

const PageHeaderContext = createContext<PageHeaderContextValue>({
  title: "",
  titleContent: null,
  setTitleState: () => {},
  leadingEl: null,
  setLeadingEl: () => {},
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
  const [titleState, setTitleState] = useState<TitleState>({ title: "", titleContent: null });
  const [leadingEl, setLeadingEl] = useState<HTMLDivElement | null>(null);
  const [actionsEl, setActionsEl] = useState<HTMLDivElement | null>(null);

  const value = useMemo(
    () => ({
      title: titleState.title,
      titleContent: titleState.titleContent,
      setTitleState,
      leadingEl,
      setLeadingEl,
      actionsEl,
      setActionsEl,
    }),
    [titleState, leadingEl, actionsEl],
  );

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
