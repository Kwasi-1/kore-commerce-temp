import { Toaster as SonnerToaster } from "sonner";

export function Toaster() {
  return (
    <SonnerToaster
      position="top-right"
      richColors
      toastOptions={{
        classNames: {
          toast: "border-0 bg-white shadow-lg",
          title: "text-sm font-semibold text-gray-900",
          description: "text-sm text-gray-600",
          actionButton: "bg-primary text-primary-foreground",
          cancelButton: "bg-gray-100 text-gray-900",
          error: "",
          success: "",
          warning: "",
          info: "",
        },
      }}
      closeButton
    />
  );
}
