import { cn } from "@/lib/utils";
import { FC } from "react";
import { Button } from "@/components/ui/button";

interface CustomContainerComponentProps {
  children: React.ReactNode;
  title?: string;
  styles?: string;
  headerStyles?: string;
  titleElement?: React.ReactNode;
  button?: {
    text: string;
    onClick?: () => void;
    disabled?: boolean;
    size?: "sm" | "md" | "lg";
    [key: string]: any;
    icon?: any;
  };
}

const CustomContainerComponent: FC<CustomContainerComponentProps> = ({
  children,
  styles = "min-h-[230px]",
  title,
  headerStyles,
  titleElement,
  button,
}) => {
  return (
    <div
      className={cn(
        `w-full h-full flex flex-col bg-card/60 backdrop-blur-md border border-border shadow-sm p-4 text-card-foreground`,
        styles,
      )}
    >
      {(title || titleElement || button) && (
        <div className="flex justify-between items-start mb-4">
          <h1 className={cn("capitalize text-foreground font-semibold", headerStyles)}>
            <span>{title}</span>
            {titleElement}
          </h1>
          {button && (
            <Button
              onClick={button.onClick}
              disabled={button.disabled}
              variant="ghost"
              size={
                button.size === "sm"
                  ? "sm"
                  : button.size === "lg"
                    ? "lg"
                    : "default"
              }
              className="text-primary-cct -my-3 flex gap-2"
              {...Object.fromEntries(
                Object.entries(button).filter(
                  ([key]) =>
                    ![
                      "text",
                      "onClick",
                      "disabled",
                      "className",
                      "variant",
                      "size",
                    ].includes(key),
                ),
              )}
            >
              {button.icon}
              {button.text}
            </Button>
          )}
        </div>
      )}
      {children}
    </div>
  );
};

export default CustomContainerComponent;
