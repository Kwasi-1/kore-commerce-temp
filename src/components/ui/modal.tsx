import * as React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const Modal = DialogPrimitive.Root;
const ModalTrigger = DialogPrimitive.Trigger;
const ModalPortal = DialogPrimitive.Portal;
const ModalClose = DialogPrimitive.Close;

const ModalOverlay = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Overlay
    ref={ref}
    className={cn(
      "fixed inset-0 z-50 bg-black/50 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
      className,
    )}
    {...props}
  />
));
ModalOverlay.displayName = DialogPrimitive.Overlay.displayName;

const modalContentVariants = cva(
  "fixed z-50 grid gap-4 bg-white shadow-lg duration-300 overflow-y-auto data-[state=open]:animate-in data-[state=closed]:animate-out",
  {
    variants: {
      placement: {
        center:
          "left-[50%] top-[50%] translate-x-[-50%] translate-y-[-50%] data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%] rounded-lg max-h-[85dvh] max-sm:left-3 max-sm:top-3 max-sm:translate-x-0 max-sm:translate-y-0 max-sm:w-[calc(100vw-1.5rem)] max-sm:max-w-none max-sm:h-[calc(100dvh-1.5rem)] max-sm:max-h-[calc(100dvh-1.5rem)] max-sm:rounded-2xl",
        top: "left-[50%] top-3 translate-x-[-50%] data-[state=closed]:slide-out-to-top data-[state=open]:slide-in-from-top rounded-b-lg max-h-[calc(100dvh-1.5rem)]",
        bottom:
          "left-[50%] bottom-3 translate-x-[-50%] data-[state=closed]:slide-out-to-bottom data-[state=open]:slide-in-from-bottom rounded-t-lg max-h-[calc(100dvh-1.5rem)]",
        left: "left-3 top-3 h-[calc(100dvh-1.5rem)] data-[state=closed]:slide-out-to-left data-[state=open]:slide-in-from-left rounded-r-2xl",
        right:
          "right-3 top-3 h-[calc(100dvh-1.5rem)] data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right rounded-l-2xl",
      },
      size: {
        sm: "w-full max-w-sm",
        default: "w-full max-w-lg",
        lg: "w-full max-w-2xl",
        xl: "w-full max-w-4xl",
        full: "w-full h-full max-w-none rounded-none",
      },
    },
    defaultVariants: {
      placement: "center",
      size: "default",
    },
  },
);

interface ModalContentProps
  extends
    React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content>,
    VariantProps<typeof modalContentVariants> {
  showClose?: boolean;
  hideOverlay?: boolean;
}

const ModalContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  ModalContentProps
>(
  (
    {
      className,
      children,
      placement,
      size,
      showClose = true,
      hideOverlay = false,
      ...props
    },
    ref,
  ) => (
    <ModalPortal>
      {!hideOverlay && <ModalOverlay />}
      <DialogPrimitive.Content
        ref={ref}
        className={cn(
          modalContentVariants({ placement, size }),
          placement === "left" || placement === "right"
            ? "max-h-[calc(100dvh-1.5rem)]"
            : "",
          className,
        )}
        {...props}
      >
        <div className="p-4 sm:p-6">{children}</div>
        {showClose && (
          <DialogPrimitive.Close className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none">
            <X className="h-4 w-4" />
            <span className="sr-only">Close</span>
          </DialogPrimitive.Close>
        )}
      </DialogPrimitive.Content>
    </ModalPortal>
  ),
);
ModalContent.displayName = DialogPrimitive.Content.displayName;

const ModalHeader = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn("flex flex-col space-y-1.5 text-left pb-4", className)}
    {...props}
  />
);
ModalHeader.displayName = "ModalHeader";

const ModalFooter = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      "flex flex-col-reverse gap-2 pt-6 sm:flex-row sm:justify-end sm:gap-2",
      className,
    )}
    {...props}
  />
);
ModalFooter.displayName = "ModalFooter";

const ModalTitle = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Title
    ref={ref}
    className={cn(
      "text-lg font-semibold leading-none tracking-tight",
      className,
    )}
    {...props}
  />
));
ModalTitle.displayName = DialogPrimitive.Title.displayName;

const ModalDescription = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Description>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Description
    ref={ref}
    className={cn("text-sm text-muted-foreground", className)}
    {...props}
  />
));
ModalDescription.displayName = DialogPrimitive.Description.displayName;

export {
  Modal,
  ModalPortal,
  ModalOverlay,
  ModalClose,
  ModalTrigger,
  ModalContent,
  ModalHeader,
  ModalFooter,
  ModalTitle,
  ModalDescription,
};
