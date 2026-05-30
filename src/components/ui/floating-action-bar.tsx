import * as React from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface FloatingActionBarProps {
  selectedCount: number;
  onClear: () => void;
  actions?: React.ReactNode;
  className?: string;
}

export function FloatingActionBar({
  selectedCount,
  onClear,
  actions,
  className,
}: FloatingActionBarProps) {
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  if (selectedCount === 0) {
    return null;
  }

  const bar = (
    <div
      className={cn(
        "fixed bottom-6 left-1/2 z-[100] -translate-x-1/2 transform",
        className,
      )}
      style={{ pointerEvents: "auto" }}
    >
      <div className="flex items-center gap-3  bg-white px-6 py-4 shadow-2xl">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center bg-primary text-primary-foreground text-sm font-bold">
            {selectedCount}
          </div>
          <span className="text-sm font-medium text-gray-900">
            {selectedCount === 1 ? "item selected" : "items selected"}
          </span>
        </div>

        {actions && (
          <>
            <div className="h-6 w-px bg-gray-300" />
            <div className="flex items-center gap-2">{actions}</div>
          </>
        )}

        <div className="h-6 w-px bg-gray-300" />

        <Button
          variant="ghost"
          size="icon"
          onClick={(e) => {
            e.stopPropagation();
            onClear();
          }}
          className="h-8 w-8"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );

  if (typeof document === "undefined" || !mounted) {
    return bar;
  }

  return createPortal(bar, document.body);
}
