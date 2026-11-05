/** Transfer status labels and badge colours, shared by the list and the detail view. */
export const TRANSFER_STATUS_LABELS: Record<string, string> = {
  requested: 'Requested',
  approved: 'Approved',
  rejected: 'Rejected',
  dispatched: 'In transit',
  received: 'Received',
  partially_received: 'Received short',
  cancelled: 'Cancelled',
};

export const transferStatusClass = (status: string) =>
  status === 'dispatched'
    ? 'bg-blue-500/10 text-blue-700 dark:text-blue-400'
    : status === 'received'
      ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400'
      : status === 'partially_received'
        ? 'bg-amber-500/10 text-amber-700 dark:text-amber-400'
        : status === 'rejected' || status === 'cancelled'
          ? 'bg-muted text-muted-foreground'
          : 'bg-foreground/5 text-foreground';
