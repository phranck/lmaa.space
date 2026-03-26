import { IconContext } from "@phosphor-icons/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { StrictMode, lazy } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router";

import "virtual:uno.css";
import "./index.css";
import App from "./App.tsx";
import { ErrorBoundary } from "./components/app/ErrorBoundary.tsx";

const ReactQueryDevtools = import.meta.env.DEV
  ? lazy(() =>
      import("@tanstack/react-query-devtools").then((m) => ({ default: m.ReactQueryDevtools })),
    )
  : () => null;

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30 * 1000,
      retry: 1,
    },
  },
});

const rootEl = document.getElementById("root");
if (!rootEl) throw new Error("Root element not found");
createRoot(rootEl).render(
  <StrictMode>
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <IconContext.Provider
          value={{
            weight: "duotone",
            style: {
              transform: "scale(1.16)",
              transformBox: "fill-box",
              transformOrigin: "center",
            },
          }}
        >
          <BrowserRouter>
            <App />
          </BrowserRouter>
        </IconContext.Provider>
        <ReactQueryDevtools initialIsOpen={false} />
      </QueryClientProvider>
    </ErrorBoundary>
  </StrictMode>,
);
