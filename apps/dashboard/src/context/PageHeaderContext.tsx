import { createContext, useContext, useState, type ReactNode } from "react";

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

export function PageHeaderProvider({ children }: { children: ReactNode }) {
  const [title, setTitle] = useState("");
  const [actionsEl, setActionsEl] = useState<HTMLDivElement | null>(null);

  return (
    <PageHeaderContext.Provider value={{ title, setTitle, actionsEl, setActionsEl }}>
      {children}
    </PageHeaderContext.Provider>
  );
}

export function usePageHeaderContext() {
  return useContext(PageHeaderContext);
}
