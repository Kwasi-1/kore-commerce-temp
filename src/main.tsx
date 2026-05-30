import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { Toaster } from "@/components/ui/toaster";
import App from "@/index";
import { NextUIProvider } from "@nextui-org/react";
import SmoothScroll from "@/components/SmoothScroll";
import "@/index.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <BrowserRouter>
      <NextUIProvider>
        <SmoothScroll>
          <App />
          <Toaster />
        </SmoothScroll>
      </NextUIProvider>
    </BrowserRouter>
  </React.StrictMode>,
);
