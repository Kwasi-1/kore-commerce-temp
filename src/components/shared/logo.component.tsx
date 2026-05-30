import { cn } from "@/lib/utils";
import React from "react";

interface LogoComponentProps {
  text?: string;
  className?: string;
  logoClassName?: string;
}

const LogoComponent: React.FC<LogoComponentProps> = ({
  text,
  className,
  logoClassName,
}) => {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-2",
        className,
      )}
    >
      <img
        src="/icons/logo-dark.svg"
        alt="Foundry Logo"
        className={cn("h-12 w-auto animate-pulse", logoClassName)}
      />
      {text && <p className="text-sm font-medium text-gray-500">{text}</p>}
    </div>
  );
};

export default LogoComponent;
