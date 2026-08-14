import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as HotToaster } from "react-hot-toast";
import App from "./App";
import { NextUIProvider } from "@nextui-org/react";
import SmoothScroll from "@/components/SmoothScroll";
import "@/index.css";

import { setupMockApi } from "@/api/mock";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { registerSW } from "virtual:pwa-register";

// Register Service Worker immediately for rock-solid offline caching on desktop & mobile
registerSW({ immediate: true });

if (import.meta.env.VITE_USE_MOCK_API === 'true') {
  setupMockApi();
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: false,
    },
  },
});

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <NextUIProvider>
          {/* <SmoothScroll> */}
            <App />
            <Toaster />
            <HotToaster position="top-right" />
          {/* </SmoothScroll> */}
        </NextUIProvider>
      </BrowserRouter>
    </QueryClientProvider>
  </React.StrictMode>,
);
