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
  const isCustomPlacement = ["right", "top", "bottom"].includes(placement);
  const resolvedRadius = isCustomPlacement ? "none" : radius;
  
  const getCustomRadiusClass = () => {
    if (radius === "none") return "rounded-none";
    if (placement === "right") {
      if (radius === "sm") return "rounded-l-sm rounded-r-none";
      if (radius === "md") return "rounded-l-md rounded-r-none";
      if (radius === "lg") return "rounded-l-lg rounded-r-none";
      return "rounded-l-[1rem] rounded-r-none";
    }
    if (placement === "top") {
      if (radius === "sm") return "rounded-b-sm rounded-t-none";
      if (radius === "md") return "rounded-b-md rounded-t-none";
      if (radius === "lg") return "rounded-b-lg rounded-t-none";
      return "rounded-b-[1rem] rounded-t-none";
    }
    if (placement === "bottom") {
      if (radius === "sm") return "rounded-t-sm rounded-b-none";
      if (radius === "md") return "rounded-t-md rounded-b-none";
      if (radius === "lg") return "rounded-t-lg rounded-b-none";
      return "rounded-t-[1rem] rounded-b-none";
    }
    return "";
  };

  return (
    <NewModal
      size={size ? size : "lg"}
      backdrop="opaque"
      isOpen={isOpen}
      isDismissable={isDismissable}
      onOpenChange={onOpenChange}
      scrollBehavior={scrollBehavior}
      placement={placement}
      radius={resolvedRadius}
      classNames={{
        body: cn("py-0 dark:text-[#F5F5F5]", classNames.body),
        base: cn(
          "border-[#161616] dark:bg-sidebar dark:text-[#a8b0d3] font-header spacing-sm",
          isCustomPlacement && getCustomRadiusClass(),
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
          {header && <ModalHeader className="flex flex-col gap-1">{header}</ModalHeader>}
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
      right: {
        wrapper: "justify-end items-stretch sm:items-stretch",
        base: "mx-0 sm:mx-0 my-0 sm:my-0 h-full max-h-screen overflow-y-auto scrollbar-hide min-w-[500px]",
      },
    },
  },
});
