import type { ReactNode } from "react";
import { Icon } from "@iconify/react";

export interface PillSidebarOption {
  key: string;
  label: ReactNode;
  count?: number;
}

interface PillSidebarProps {
  options: PillSidebarOption[];
  activeKey: string;
  onChange: (key: string) => void;
  className?: string;
}

export function PillSidebar({
  options,
  activeKey,
  onChange,
  className = "",
}: PillSidebarProps) {
  return (
    <div
      className={`flex lg:flex-col gap-3 overflow-x-auto lg:overflow-visible md:pb-2 xl:pb-0 scrollbar-hide font-header ${className}`}
    >
      {options.map((opt) => {
        const isActive = activeKey === opt.key;
        return (
          <button
            key={opt.key}
            type="button"
            onClick={() => onChange(opt.key)}
            className={`flex items-center justify-between pl-5 pr-[2px] py-[3px] lg:py-1 lg:pr-1 rounded-full shrink-0 xl:shrink-auto whitespace-nowrap xl:whitespace-normal border shadowsm lg:gap-6
              transition-[background-color,border-color,color] duration-200 ease-in-out
              ${
                isActive
                  ? "bg-foreground text-background border-foreground"
                  : "bg-background text-foreground-900 hover:bg-muted/20"
              }`}
          >
            <span className="font-medium text-[15px]">{opt.label}</span>
            {typeof opt.count === "number" ? (
              <span
                className={`h-10 w-10 lg:w-12 lg:h-12 ml-3 flex items-center justify-center rounded-full text-xs font-bold
                  transition-[background-color,color] duration-200 ease-in-out
                  ${isActive ? "bg-primary-foreground/90 text-white" : "bg-secondary text-secondary-foreground"}`}
              >
                {opt.count}
              </span>
            ) : (
              <span
                className={`h-10 w-10 lg:w-12 lg:h-12 ml-3 flex items-center justify-center rounded-full
                  transition-[background-color,color] duration-200 ease-in-out
                  ${isActive ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground"}`}
                aria-hidden="true"
              >
                <Icon icon="solar:alt-arrow-right-linear" className="h-4 w-4" />
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}