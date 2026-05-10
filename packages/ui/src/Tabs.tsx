import type { ReactNode } from "react";

import { cx } from "./classNames.ts";
import {
  TabListPrimitive,
  TabPanelPrimitive,
  TabsPrimitive,
  TabTriggerPrimitive,
} from "./TabsPrimitives.tsx";

export interface TabsProps {
  value: string;
  onValueChange: (value: string) => void;
  children: ReactNode;
  className?: string;
}

export interface TabListProps {
  children: ReactNode;
  className?: string;
}

export interface TabTriggerProps {
  value: string;
  children: ReactNode;
  className?: string;
}

export interface TabContentProps {
  value: string;
  children: ReactNode;
  className?: string;
}

export function Tabs({ value, onValueChange, children, className = "" }: TabsProps) {
  return (
    <TabsPrimitive value={value} onValueChange={onValueChange} className={className}>
      {children}
    </TabsPrimitive>
  );
}

export function TabList({ children, className = "" }: TabListProps) {
  return <TabListPrimitive className={className}>{children}</TabListPrimitive>;
}

export function TabTrigger({ value, children, className = "" }: TabTriggerProps) {
  return (
    <TabTriggerPrimitive value={value} className={cx("-mb-px", className)}>
      {children}
    </TabTriggerPrimitive>
  );
}

export function TabContent({ value, children, className = "" }: TabContentProps) {
  return (
    <TabPanelPrimitive value={value} className={className}>
      {children}
    </TabPanelPrimitive>
  );
}
