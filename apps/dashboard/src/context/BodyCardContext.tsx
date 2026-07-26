import { type ReactNode, createContext, use, useMemo, useState } from "react";

interface BodyCardContextValue {
  /** When true, the body card becomes transparent and centers its content. */
  chromeless: boolean;
  setChromeless: (value: boolean) => void;
}

const BodyCardContext = createContext<BodyCardContextValue>({
  chromeless: false,
  setChromeless: () => {},
});

export function BodyCardProvider({ children }: { children: ReactNode }) {
  const [chromeless, setChromeless] = useState(false);
  const value = useMemo(() => ({ chromeless, setChromeless }), [chromeless]);
  return <BodyCardContext.Provider value={value}>{children}</BodyCardContext.Provider>;
}

export function useBodyCard() {
  return use(BodyCardContext);
}
