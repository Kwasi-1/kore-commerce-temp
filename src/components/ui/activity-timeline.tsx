import * as React from "react";
import type { LucideIcon } from "lucide-react";
import { Paperclip } from "lucide-react";

import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";

type Tone = "default" | "success" | "warning" | "danger" | "info";

export interface ActivityTimelineAttachment {
  id: string;
  label: string;
  href?: string;
}

export interface ActivityTimelineActor {
  name: string;
  avatar?: string;
}

export interface ActivityTimelineItem {
  id: string;
  actor?: ActivityTimelineActor;
  title: string;
  description?: string;
  timestamp: React.ReactNode;
  tone?: Tone;
  badge?: string;
  icon?: LucideIcon;
  comment?: string;
  meta?: string[];
  attachments?: ActivityTimelineAttachment[];
  footer?: React.ReactNode;
}

interface ActivityTimelineProps {
  items: ActivityTimelineItem[];
  className?: string;
  label?: string;
  pageSize?: number;
}

const toneStyles: Record<Tone, { indicator: string; pill: string }> = {
  default: { indicator: "bg-gray-900 text-white", pill: "text-gray-500" },
  success: { indicator: "bg-emerald-600 text-white", pill: "text-emerald-700" },
  warning: { indicator: "bg-amber-500 text-white", pill: "text-amber-700" },
  danger: { indicator: "bg-rose-500 text-white", pill: "text-rose-700" },
  info: { indicator: "bg-sky-500 text-white", pill: "text-sky-700" },
};

export function ActivityTimeline({
  items,
  className,
  label,
  pageSize,
}: ActivityTimelineProps) {
  const [page, setPage] = React.useState(0);
  const effectivePageSize = pageSize && pageSize > 0 ? pageSize : items.length;
  const totalPages = Math.max(1, Math.ceil(items.length / effectivePageSize));

  React.useEffect(() => {
    setPage((prev) => Math.min(prev, totalPages - 1));
  }, [totalPages]);

  const startIndex = page * effectivePageSize;
  const pageItems = items.slice(startIndex, startIndex + effectivePageSize);

  return (
    <div className={cn("space-y-6", className)}>
      <ol
        className="relative space-y-10"
        aria-label={label ?? "Activity timeline"}
      >
        {pageItems.map((item, index) => {
          const tone = toneStyles[item.tone ?? "default"];
          const initials = item.actor?.name
            ?.split(" ")
            .map((n) => n[0])
            .slice(0, 2)
            .join("");
          const Icon = item.icon;
          const actorName = item.actor?.name ?? "User";

          return (
            <li key={item.id} className="relative pl-16">
              <span
                className={cn(
                  "absolute left-6 top-12 h-[calc(100%-2rem)] w-px bg-gray-200",
                  index === pageItems.length - 1 && "hidden",
                )}
                aria-hidden="true"
              />

              <div className="absolute left-0 top-0">
                {Icon ? (
                  <span
                    className={cn(
                      "flex h-12 w-12 items-center justify-center bg-white text-sm font-semibold border border-gray-300",
                      tone.indicator,
                    )}
                  >
                    <Icon className="h-4 w-4" aria-hidden="true" />
                  </span>
                ) : item.actor ? (
                  <Avatar className="h-12 w-12 border border-gray-300">
                    <AvatarImage src={item.actor?.avatar} alt={actorName} />
                    <AvatarFallback>{initials}</AvatarFallback>
                  </Avatar>
                ) : (
                  <span
                    className={cn(
                      "flex h-12 w-12 items-center justify-center bg-white text-xs font-semibold uppercase border border-gray-300",
                      tone.indicator,
                    )}
                  >
                    {item.badge?.slice(0, 3) || "â€¢"}
                  </span>
                )}
              </div>

              <div className="space-y-3 border border-gray-200 bg-white p-3">
                <div className="flex flex-wrap items-center gap-2">
                  {item.actor?.name && (
                    <span className="text-sm font-semibold text-gray-900">
                      {item.actor?.name}
                    </span>
                  )}
                  <p className="text-sm text-gray-600">{item.title}</p>
                  {item.badge && (
                    <Badge variant="outline" className="px-2 py-0 text-xs">
                      {item.badge}
                    </Badge>
                  )}
                  <span className="ml-auto text-xs font-medium text-gray-400">
                    {item.timestamp}
                  </span>
                </div>

                {item.description && (
                  <p className="text-sm text-gray-600">{item.description}</p>
                )}

                {item.meta && item.meta.length > 0 && (
                  <div className="flex flex-wrap gap-2 text-xs">
                    {item.meta.map((meta) => (
                      <span
                        key={meta}
                        className="inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-gray-600"
                      >
                        {meta}
                      </span>
                    ))}
                  </div>
                )}

                {item.comment && (
                  <div className="rounded-lg border border-gray-100 bg-white p-4 text-sm text-gray-700">
                    {item.comment}
                  </div>
                )}

                {item.attachments && item.attachments.length > 0 && (
                  <div className="flex flex-wrap gap-2 pt-1">
                    {item.attachments.map((file) => (
                      <a
                        key={file.id}
                        href={file.href ?? "#"}
                        className="inline-flex items-center gap-1 border border-gray-200 px-3 py-1 text-xs font-medium text-gray-600 transition hover:border-gray-300 hover:text-gray-900"
                      >
                        <Paperclip className="h-3.5 w-3.5" aria-hidden="true" />
                        {file.label}
                      </a>
                    ))}
                  </div>
                )}

                {item.footer && (
                  <div className="flex flex-wrap gap-2 border-t border-dashed pt-3 text-xs text-gray-500">
                    {item.footer}
                  </div>
                )}
              </div>
            </li>
          );
        })}
      </ol>
      {pageSize && totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-gray-500">
          <span>
            Page {page + 1} of {totalPages}
          </span>
          <div className="flex gap-2">
            <button
              type="button"
              className="px-3 py-1 border text-xs font-medium disabled:opacity-50"
              onClick={() => setPage((prev) => Math.max(0, prev - 1))}
              disabled={page === 0}
            >
              Previous
            </button>
            <button
              type="button"
              className="px-3 py-1 border text-xs font-medium disabled:opacity-50"
              onClick={() =>
                setPage((prev) => Math.min(totalPages - 1, prev + 1))
              }
              disabled={page === totalPages - 1}
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
