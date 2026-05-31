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

if (import.meta.env.VITE_USE_MOCK_API === 'true') {
  setupMockApi();
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <BrowserRouter>
      <NextUIProvider>
        {/* <SmoothScroll> */}
          <App />
          <Toaster />
          <HotToaster position="top-right" />
        {/* </SmoothScroll> */}
      </NextUIProvider>
    </BrowserRouter>
  </React.StrictMode>,
);
