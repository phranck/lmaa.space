import { createContext, useContext } from "react";

/* ------------------------------------------------------------------ */
/*  Context                                                           */
/* ------------------------------------------------------------------ */

interface TabsContextValue {
  value: string;
  onValueChange: (value: string) => void;
}

const TabsContext = createContext<TabsContextValue | null>(null);

function useTabsContext() {
  const ctx = useContext(TabsContext);
  if (!ctx) throw new Error("Tabs compound components must be used within <Tabs>");
  return ctx;
}

/* ------------------------------------------------------------------ */
/*  Props                                                             */
/* ------------------------------------------------------------------ */

export interface TabsProps {
  value: string;
  onValueChange: (value: string) => void;
  children: React.ReactNode;
  className?: string;
}

export interface TabListProps {
  children: React.ReactNode;
  className?: string;
}

export interface TabTriggerProps {
  value: string;
  children: React.ReactNode;
  className?: string;
}

export interface TabContentProps {
  value: string;
  children: React.ReactNode;
  className?: string;
}

/* ------------------------------------------------------------------ */
/*  Components                                                        */
/* ------------------------------------------------------------------ */

export function Tabs({ value, onValueChange, children, className = "" }: TabsProps) {
  return (
    <TabsContext.Provider value={{ value, onValueChange }}>
      <div className={className}>{children}</div>
    </TabsContext.Provider>
  );
}

export function TabList({ children, className = "" }: TabListProps) {
  return (
    <div
      role="tablist"
      className={`flex gap-1 border-b border-[var(--ds-border)] ${className}`}
    >
      {children}
    </div>
  );
}

export function TabTrigger({ value, children, className = "" }: TabTriggerProps) {
  const { value: selected, onValueChange } = useTabsContext();
  const isActive = selected === value;

  return (
    <button
      type="button"
      role="tab"
      aria-selected={isActive}
      onClick={() => onValueChange(value)}
      className={`px-4 py-2 text-sm font-medium transition-colors -mb-px border-b-2 ${
        isActive
          ? "border-[var(--color-primary)] text-[var(--color-primary)]"
          : "border-transparent text-[var(--ds-text-secondary)] hover:text-[var(--ds-text)] hover:border-[var(--ds-border-strong)]"
      } ${className}`}
    >
      {children}
    </button>
  );
}

export function TabContent({ value, children, className = "" }: TabContentProps) {
  const { value: selected } = useTabsContext();
  if (selected !== value) return null;

  return (
    <div role="tabpanel" className={className}>
      {children}
    </div>
  );
}
