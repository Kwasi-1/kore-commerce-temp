import React from 'react';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { format } from 'date-fns';
import { Info, RotateCcw, Pencil, User, Calendar, MessageSquare } from 'lucide-react';

interface AuditLogPopoverProps {
  /** Disbursal or Run item */
  item: any;
  /** Size variant: 'badge' (inline status badge) or 'icon' (small button) */
  variant?: 'badge' | 'icon';
}

export default function AuditLogPopover({ item, variant = 'badge' }: AuditLogPopoverProps) {
  const [open, setOpen] = React.useState(false);

  if (!item) return null;

  const isVoided = item.status === 'voided';
  const isEdited = Boolean(item.last_edited_by || item.last_edited_by_name || item.edit_reason || item.last_edited_at);

  if (!isVoided && !isEdited) return null;

  const editorName = item.last_edited_by_name || item.created_by_name || 'Manager';
  const editedAt = item.last_edited_at || item.date_updated || item.date_voided;
  const reasonText = item.reversal_reason || item.edit_reason || item.note;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        {variant === 'badge' ? (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setOpen((prev) => !prev);
            }}
            className={`inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded cursor-pointer transition-colors select-none ${
              isVoided
                ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400 hover:bg-rose-500/20'
                : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 hover:bg-amber-500/20'
            }`}
            title="Click to view audit history"
          >
            {isVoided ? <RotateCcw className="h-3 w-3" /> : <Pencil className="h-3 w-3" />}
            {isVoided ? 'Reversed' : 'Edited'}
          </button>
        ) : (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setOpen((prev) => !prev);
            }}
            className="p-1 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted/60 cursor-pointer transition-colors select-none"
            title="View Audit Log"
          >
            <Info className="h-3.5 w-3.5" />
          </button>
        )}
      </PopoverTrigger>

      <PopoverContent
        align="start"
        side="left"
        className="w-72 p-3.5 text-xs space-y-3 bg-popover text-popover-foreground border border-border shadow-md rounded-md z-50"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border pb-2">
          <span className="font-bold flex items-center gap-1.5 text-foreground">
            {isVoided ? (
              <span className="text-rose-500 flex items-center gap-1">
                <RotateCcw className="h-3.5 w-3.5" /> Reversal Log
              </span>
            ) : (
              <span className="text-amber-500 flex items-center gap-1">
                <Pencil className="h-3.5 w-3.5" /> Modification Log
              </span>
            )}
          </span>
          <span className="text-[10px] text-muted-foreground font-mono">
            {editedAt ? format(new Date(editedAt), 'MMM dd, HH:mm') : 'Recent'}
          </span>
        </div>

        {/* Audit Details Grid */}
        <div className="space-y-1.5 text-xs">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground flex items-center gap-1">
              <User className="h-3 w-3" /> Action By:
            </span>
            <strong className="text-foreground">{editorName}</strong>
          </div>

          {editedAt && (
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground flex items-center gap-1">
                <Calendar className="h-3 w-3" /> Timestamp:
              </span>
              <span className="text-foreground font-medium">
                {format(new Date(editedAt), 'MMM dd, yyyy - hh:mm a')}
              </span>
            </div>
          )}
        </div>

        {/* Reason Callout */}
        {reasonText && (
          <div className="p-2.5 rounded bg-muted/40 border-l-2 border-primary space-y-0.5">
            <span className="text-[10px] uppercase font-bold text-muted-foreground flex items-center gap-1">
              <MessageSquare className="h-3 w-3" /> Reason Provided
            </span>
            <p className="text-xs text-foreground italic">{reasonText}</p>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
