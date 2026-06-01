import React from "react";
import { cn } from "@/lib/utils";

interface SpinnerProps extends React.HTMLAttributes<HTMLDivElement> {
  withBackdrop?: boolean;
}

export function Spinner({ withBackdrop, className, ...props }: SpinnerProps) {
  const dots = (
    <div className={cn("flex items-center justify-center gap-1.5", className)} {...props}>
      <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0ms', animationDuration: '1s' }}></div>
      <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '150ms', animationDuration: '1s' }}></div>
      <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '300ms', animationDuration: '1s' }}></div>
    </div>
  );

  if (withBackdrop) {
    return (
      <div className="absolute inset-0 z-50 flex items-center justify-center bg-background/40 backdrop-blur-[2px] rounded-inherit">
        {dots}
      </div>
    );
  }

  return dots;
}
