import { Toaster as SonnerToaster } from "sonner";

export function Toaster() {
  return (
    <SonnerToaster
      position="top-right"
      richColors
      toastOptions={{
        classNames: {
          toast: "border-0 bg-white shadow-lg",
          title: "text-sm font-semibold text-foreground",
          description: "text-sm text-muted-foreground",
          actionButton: "bg-primary text-primary-foreground",
          cancelButton: "bg-gray-100 text-foreground",
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
