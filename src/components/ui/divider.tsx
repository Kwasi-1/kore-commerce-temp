import { cn } from "@/lib/utils";

interface DividerProps {
  orientation?: "horizontal" | "vertical";
  className?: string;
}

export function Divider({
  orientation = "horizontal",
  className,
}: DividerProps) {
  return (
    <div
      role="separator"
      aria-orientation={orientation}
      className={cn(
        "bg-gray-300",
        orientation === "horizontal"
          ? "h-px w-full"
          : "w-px h-full inline-block",
        className
      )}
    />
  );
}
