import { cn } from "@/lib/utils";
import {
  extendVariants,
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
} from "@nextui-org/react";
import { FC } from "react";

interface CustomModalProps {
  onClose?: () => void;
  isOpen: boolean;
  onOpenChange: () => void;
  header?: React.ReactNode;
  body: React.ReactNode;
  footer?: React.ReactNode;
  size?:
    | "sm"
    | "lg"
    | "md"
    | "xs"
    | "xl"
    | "2xl"
    | "3xl"
    | "4xl"
    | "5xl"
    | "full";
  radius?: "sm" | "lg" | "md" | "none";
  scrollBehavior?: "outside" | "inside" | "normal";
  placement?:
    | "auto"
    | "center"
    | "top"
    | "right"
    | "top-center"
    | "bottom"
    | "bottom-center";
  isDismissable?: boolean;
  classNames?: Partial<{
    header: any;
    body: any;
    footer: any;
    wrapper: any;
    base: any;
    backdrop: any;
    closeButton: any;
  }>;
}

const CustomModal: FC<CustomModalProps> = ({
  isOpen,
  onOpenChange,
  header,
  body,
  footer,
  size,
  scrollBehavior,
  placement = "center",
  radius = "md",
  isDismissable = true,
  classNames = {},
}) => {
  return (
    <NewModal
      size={size ? size : "lg"}
      backdrop="opaque"
      isOpen={isOpen}
      isDismissable={isDismissable}
      onOpenChange={onOpenChange}
      scrollBehavior={scrollBehavior}
      placement={placement}
      radius={radius}
      classNames={{
        body: cn("py-0 dark:text-[#F5F5F5]", classNames.body),
        base: cn(
          "border-[#161616] dark:bg-sidebar dark:text-[#a8b0d3] font-header spacing-sm",
          classNames.base,
        ),
        header: cn("dark:text-[#F5F5F5]", classNames.header),
        closeButton: cn(
          "absolute z-[99] right-4 top-2 dark:hover:bg-white/5 active:bg-white/10 text-[16px]",
          classNames.closeButton,
        ),
      }}
      motionProps={{
        variants: {
          enter: {
            ...(placement === "right" ? { x: 0 } : { y: 0 }),
            opacity: 1,
            transition: {
              duration: 0.3,
              ease: "easeOut",
            },
          },
          exit: {
            ...(placement === "right" ? { x: 80 } : { y: -20 }),
            opacity: 0,
            transition: {
              duration: 0.2,
              ease: "easeIn",
            },
          },
        },
      }}
    >
      <ModalContent className="">
        <>
          {header && (
            <ModalHeader className="flex flex-col gap-1">{header}</ModalHeader>
          )}
          <ModalBody className="">{body}</ModalBody>
          {footer && <ModalFooter>{footer}</ModalFooter>}
        </>
      </ModalContent>
    </NewModal>
  );
};

export default CustomModal;

const NewModal = extendVariants(Modal, {
  variants: {
    placement: {
      auto: {
        wrapper: "items-center justify-center",
        base: "mx-3 my-3 sm:mx-4 sm:my-4 max-h-[calc(100dvh-1.5rem)] sm:max-h-[calc(100dvh-2rem)]",
      },
      center: {
        wrapper: "items-center justify-center",
        base: "mx-3 my-3 sm:mx-4 sm:my-4 w-[calc(100vw-1.5rem)]  max-h-[calc(100dvh-1.5rem)] sm:max-h-[85dvh] overflow-y-auto rounded-2xl",
      },
      "top-center": {
        wrapper: "items-start justify-center",
        base: "mx-3 mt-3 mb-0 sm:mx-4 sm:mt-4 sm:mb-0 w-[calc(100vw-1.5rem)] sm:w-auto max-w-[calc(100vw-1.5rem)] sm:max-w-[650px] max-h-[calc(100dvh-1.5rem)] overflow-y-auto rounded-b-2xl rounded-t-none",
      },
      "bottom-center": {
        wrapper: "items-end justify-center",
        base: "mx-3 mb-3 mt-0 sm:mx-4 sm:mb-4 sm:mt-0 w-[calc(100vw-1.5rem)] sm:w-auto max-w-[calc(100vw-1.5rem)] sm:max-w-[650px] max-h-[calc(100dvh-1.5rem)] overflow-y-auto rounded-t-2xl rounded-b-none",
      },
      top: {
        wrapper: "items-start justify-center",
        base: "mx-3 mt-3 mb-0 sm:mx-4 sm:mt-4 sm:mb-0 w-[calc(100vw-1.5rem)] sm:w-auto max-w-[calc(100vw-1.5rem)] sm:max-w-[900px] max-h-[calc(100dvh-1.5rem)] overflow-y-auto rounded-b-2xl rounded-t-none",
      },
      bottom: {
        wrapper: "items-end justify-center",
        base: "mx-3 mb-3 mt-0 sm:mx-4 sm:mb-4 sm:mt-0 w-[calc(100vw-1.5rem)] sm:w-auto max-w-[calc(100vw-1.5rem)] sm:max-w-[900px] max-h-[calc(100dvh-1.5rem)] overflow-y-auto rounded-t-2xl rounded-b-none",
      },
      right: {
        wrapper: "justify-end items-stretch sm:items-stretch",
        base: "mx-2 my-2 sm:mx-4 sm:my-4 h-[calc(100dvh-1rem)] sm:h-[calc(100dvh-2rem)] max-h-[calc(100dvh-1rem)] sm:max-h-[calc(100dvh-1.5rem)] overflow-y-auto scrollbar-hide w-[calc(100vw-1rem)] sm:w-auto min-w-0 sm:min-w-[450px] rounded-2xl",
      },
    },
  },
});
