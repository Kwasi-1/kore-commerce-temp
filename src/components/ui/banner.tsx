import * as React from "react";
import { X, CheckCircle, AlertTriangle, Info, AlertCircle } from "lucide-react";

import { cn } from "@/lib/utils";

const variantIcons = {
  default: Info,
  success: CheckCircle,
  warning: AlertTriangle,
  danger: AlertCircle,
};

export interface BannerProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: keyof typeof variantIcons;
  title?: string;
  description?: string;
  muted?: boolean;
  dismissible?: boolean;
  onDismiss?: () => void;
}

export function Banner({
  className,
  variant = "default",
  title,
  description,
  muted = false,
  dismissible,
  onDismiss,
  children,
  ...props
}: BannerProps) {
  const Icon = variantIcons[variant];

  return (
    <div
      className={cn(
        "flex w-full items-center gap-4 rounded-lg border px-5 py-4 shadow-sm",
        muted
          ? "border-slate-200 bg-gradient-to-br from-slate-50 to-gray-50/50 text-slate-700 shadow-slate-100/50"
          : variant === "success"
            ? "border-green-200 bg-gradient-to-br from-green-50 to-green-100/50 text-green-900 shadow-green-100/50"
            : variant === "warning"
              ? "border-amber-200 bg-gradient-to-br from-amber-50 to-orange-50/80 text-amber-950 shadow-amber-100/50"
              : variant === "danger"
                ? "border-red-200 bg-gradient-to-br from-red-50 to-rose-50/80 text-red-900 shadow-red-100/50"
                : "border-blue-200 bg-gradient-to-br from-blue-50 to-indigo-50/50 text-blue-900 shadow-blue-100/50",
        className,
      )}
      {...props}
    >
      <Icon
        className={cn(
          "mt-0.5 h-5 w-5 flex-shrink-0",
          muted
            ? "text-slate-500"
            : variant === "success"
              ? "text-green-600"
              : variant === "warning"
                ? "text-amber-600"
                : variant === "danger"
                  ? "text-red-600"
                  : "text-blue-600",
        )}
      />
      <div className="flex flex-1 flex-col gap-1.5">
        {title && (
          <p className="text-base font-semibold leading-tight">{title}</p>
        )}
        {description && (
          <p
            className={cn(
              "text-sm leading-relaxed",
              muted
                ? "text-slate-600/80"
                : variant === "success"
                  ? "text-green-800/80"
                  : variant === "warning"
                    ? "text-amber-900/70"
                    : variant === "danger"
                      ? "text-red-800/80"
                      : "text-blue-800/80",
            )}
          >
            {description}
          </p>
        )}
        {children}
      </div>
      {dismissible && (
        <button
          type="button"
          onClick={onDismiss}
          className={cn(
            "rounded-md border border-transparent p-1.5 transition-all hover:bg-white/50",
            muted
              ? "text-slate-600 hover:border-slate-200 hover:text-slate-900"
              : variant === "success"
                ? "text-green-700 hover:border-green-200 hover:text-green-900"
                : variant === "warning"
                  ? "text-amber-700 hover:border-amber-200 hover:text-amber-900"
                  : variant === "danger"
                    ? "text-red-700 hover:border-red-200 hover:text-red-900"
                    : "text-blue-700 hover:border-blue-200 hover:text-blue-900",
          )}
        >
          <X className="h-4 w-4" />
          <span className="sr-only">Dismiss</span>
        </button>
      )}
    </div>
  );
}
