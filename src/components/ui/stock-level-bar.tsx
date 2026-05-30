import { cn } from "@/lib/utils";

interface StockLevelBarProps {
  current: number;
  max: number;
  className?: string;
}

export function StockLevelBar({ current, max, className }: StockLevelBarProps) {
  const percentage = Math.min((current / max) * 100, 100);

  const getColor = () => {
    if (percentage < 20) return "bg-red-500";
    if (percentage < 50) return "bg-amber-500";
    return "bg-green-500";
  };

  return (
    <div className={cn("flex items-center gap-2 min-w-[120px]", className)}>
      <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
        <div
          className={cn("h-full transition-all duration-300", getColor())}
          style={{ width: `${percentage}%` }}
        />
      </div>
      <span className="text-xs font-medium text-muted-foreground whitespace-nowrap">
        {current}/{max}
      </span>
    </div>
  );
}
