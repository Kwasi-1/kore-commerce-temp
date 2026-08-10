import React, { useState } from 'react';
import { format } from 'date-fns';
import { History, ChevronDown, ChevronUp, ArrowRight } from 'lucide-react';

interface AuditTrailTimelineProps {
  logs: any[];
  defaultExpanded?: boolean;
  title?: string;
}

export default function AuditTrailTimeline({
  logs = [],
  defaultExpanded = false,
  title = 'Audit History & Revisions',
}: AuditTrailTimelineProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  if (!logs || logs.length === 0) return null;

  return (
    <div className="rounded border border-border/80 bg-muted/20 overflow-hidden text-xs">
      {/* Monochromatic Accordion Header */}
      <button
        type="button"
        onClick={() => setIsExpanded((prev) => !prev)}
        className="w-full px-3.5 py-2 flex items-center justify-between hover:bg-muted/40 transition-colors text-left cursor-pointer"
      >
        <div className="flex items-center gap-2">
          <History className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="font-semibold text-foreground">
            {title} ({logs.length})
          </span>
        </div>
        <div className="flex items-center gap-1.5 text-muted-foreground text-[11px]">
          <span>{isExpanded ? 'Hide' : 'Show'}</span>
          {isExpanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
        </div>
      </button>

      {/* Clean Monochromatic Vertical Timeline */}
      {isExpanded && (
        <div className="px-4 py-3 border-t border-border/60 bg-background/50 space-y-4">
          <div className="relative pl-6 space-y-4 before:absolute before:left-2 before:top-2.5 before:bottom-2.5 before:w-px before:bg-border/80">
            {logs.map((log: any, idx: number) => {
              const isReversal = log.action_type === 'reversed';
              const isEdit = log.action_type === 'edited';

              return (
                <div key={log.id || idx} className="relative space-y-1">
                  {/* Subtle Monochromatic Dot Marker aligned perfectly on the line */}
                  <div className="absolute left-[-20px] top-1 flex items-center justify-center">
                    <span
                      className={`h-2 w-2 rounded-full ring-2 ring-background ${
                        isReversal
                          ? 'bg-foreground'
                          : isEdit
                          ? 'bg-foreground/70'
                          : 'bg-muted-foreground/50'
                      }`}
                    />
                  </div>

                  {/* Top Line: Event Title + Performer + Date */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 font-medium text-foreground">
                      <span>
                        {isReversal ? 'Payment Reversed' : isEdit ? 'Payout Details Modified' : 'Disbursed & Logged'}
                      </span>
                      <span className="text-muted-foreground font-normal">by</span>
                      <span className="font-semibold">{log.performed_by_name || 'System Owner'}</span>
                    </div>

                    <span className="text-[10px] text-muted-foreground font-medium shrink-0">
                      {log.date_created ? format(new Date(log.date_created), 'MMM dd, HH:mm') : '—'}
                    </span>
                  </div>

                  {/* Value Transition Chip (Old -> New) */}
                  {(log.old_values || log.new_values) && (
                    <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-muted/60 text-[11px] font-mono text-muted-foreground">
                      {log.old_values && <span>{log.old_values}</span>}
                      {log.old_values && log.new_values && <ArrowRight className="h-3 w-3 shrink-0 text-muted-foreground/60" />}
                      {log.new_values && <span className="font-medium text-foreground">{log.new_values}</span>}
                    </div>
                  )}

                  {/* Reason Text */}
                  {log.reason && (
                    <p className="text-[11px] text-muted-foreground italic">
                      <span className="not-italic font-medium text-foreground/80">Reason:</span> "{log.reason}"
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
