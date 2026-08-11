import React, { useState } from 'react';
import CustomModal from '@/components/modals/modal';
import { CurrencyDisplay } from '@/hooks';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';
import {
  Pencil,
  RotateCcw,
  CheckCircle2,
  FileText,
  XCircle,
  History,
  X,
} from 'lucide-react';
import EnhancedTableComponent from '@/components/shared/MainTableComponent';
import DisburalLineActions from '@/components/staff/DisburalLineActions';
import AuditTrailTimeline from '@/components/staff/AuditTrailTimeline';

interface PayrollRunDetailsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  run: any;
  onRefresh: () => void;
}

export default function PayrollRunDetailsDrawer({
  isOpen,
  onClose,
  run,
  onRefresh,
}: PayrollRunDetailsDrawerProps) {
  const [editingLine, setEditingLine] = useState<any>(null);
  const [reversingLine, setReversingLine] = useState<any>(null);
  const [activeAuditLine, setActiveAuditLine] = useState<any>(null);

  // Reset selected audit line when drawer closes or run ID changes
  React.useEffect(() => {
    setActiveAuditLine(null);
  }, [isOpen, run?.id]);

  if (!run) return null;

  const items = run.items || [];

  const columns = [
    { key: 'recipient', label: 'Recipient' },
    { key: 'amount', label: 'Amount' },
    { key: 'method', label: 'Payment Method' },
    { key: 'status', label: 'Status' },
    { key: 'actions', label: 'Actions' },
  ];

  const rows = items.map((item: any) => {
    const isVoided = item.status === 'voided';
    const isEdited = Boolean(item.last_edited_by || item.last_edited_by_name || item.edit_reason);
    const isCurrentlyAudited = activeAuditLine?.id === item.id;

    // Build line-item audit logs fallback
    const itemAuditLogs = item.audit_logs && item.audit_logs.length > 0
      ? item.audit_logs
      : [
          ...(isVoided
            ? [
                {
                  id: 'log_v',
                  action_type: 'reversed',
                  performed_by_name: item.last_edited_by_name || 'Manager',
                  date_created: item.date_voided || item.date_updated,
                  reason: item.reversal_reason || 'Line reversed',
                  old_values: `GHS ${item.amount} (${item.payment_method?.replace(/_/g, ' ')})`,
                  new_values: 'GHS 0.00 (Voided)',
                },
              ]
            : []),
          ...(isEdited && !isVoided
            ? [
                {
                  id: 'log_e',
                  action_type: 'edited',
                  performed_by_name: item.last_edited_by_name || 'Manager',
                  date_created: item.date_updated,
                  reason: item.edit_reason || 'Payout modified',
                  new_values: `GHS ${item.amount} (${item.payment_method?.replace(/_/g, ' ')})`,
                },
              ]
            : []),
          {
            id: 'log_d',
            action_type: 'disbursed',
            performed_by_name: run.created_by_name || 'System Owner',
            date_created: item.date_paid || run.disbursal_date,
            new_values: `GHS ${item.amount} (${item.payment_method?.replace(/_/g, ' ')})`,
            reason: item.note || 'Disbursed in payroll run',
          },
        ];

    return {
      id: item.id,
      recipient: (
        <div className={`flex flex-col min-w-[100px] p-1 rounded transition-colors ${isCurrentlyAudited ? 'bg-primary/10 -ml-1 border-l-2 border-primary pl-2' : ''}`}>
          <span className={`font-semibold ${isVoided ? 'line-through text-muted-foreground' : 'text-foreground'}`}>
            {item.staff_name || item.recipient_name}
          </span>
          <div className="flex items-center gap-1.5 mt-0.5">
            {item.is_off_platform && (
              <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-purple-400/10 text-purple-600 dark:text-purple-400">
                External
              </span>
            )}
            {item.note && <span className="text-[10px] text-muted-foreground italic">({item.note})</span>}
          </div>
        </div>
      ),
      amount: (
        <span className={`font-bold ${isVoided ? 'line-through text-muted-foreground' : 'text-foreground'}`}>
          <CurrencyDisplay amount={item.amount} showStyling={false} />
        </span>
      ),
      method: (
        <span className="capitalize text-xs font-medium text-muted-foreground px-2 py-0.5 rounded bg-muted/60">
          {item.payment_method?.replace(/_/g, ' ') || 'Cash'}
        </span>
      ),
      status: (
        <div className="flex items-center gap-1.5">
          {isVoided ? (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold bg-rose-400/10 text-rose-600 dark:text-rose-400">
              <XCircle className="h-3 w-3" /> Voided
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold bg-green-400/10 text-green-600 dark:text-green-400">
              <CheckCircle2 className="h-3 w-3" /> Logged
            </span>
          )}

          {/* Clickable Badge to toggle line item audit history */}
          {(isVoided || isEdited) && (
            <button
              type="button"
              onClick={() => setActiveAuditLine(isCurrentlyAudited ? null : { ...item, logs: itemAuditLogs })}
              className={`inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded cursor-pointer transition-colors ${
                isVoided
                  ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400 hover:bg-rose-500/20'
                  : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 hover:bg-amber-500/20'
              }`}
              title="Click to toggle audit trail workspace"
            >
              <History className="h-3 w-3" />
              {isVoided ? 'Reversed' : 'Edited'}
            </button>
          )}
        </div>
      ),
      actions: !isVoided ? (
        <div className="flex items-center gap-1">
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setEditingLine(item)}
            className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground cursor-pointer"
            title="Edit Line"
          >
            <Pencil className="h-3.5 w-3.5" />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setReversingLine(item)}
            className="h-7 w-7 p-0 text-rose-500 hover:text-rose-600 hover:bg-rose-500/10 cursor-pointer"
            title="Reverse Line"
          >
            <RotateCcw className="h-3.5 w-3.5" />
          </Button>
        </div>
      ) : (
        <span className="text-xs text-muted-foreground italic">—</span>
      ),
    };
  });

  const hasLastEdit = Boolean(run.last_edited_by_name || run.last_edited_at);

  return (
    <>
      <CustomModal
        isOpen={isOpen}
        onOpenChange={onClose}
        placement="right"
        size="lg"
        classNames={{
          base: activeAuditLine
            ? 'sm:w-[1100px] lg:max-w-6xl transition-all duration-300 ease-in-out'
            : 'sm:w-[560px] transition-all duration-300 ease-in-out',
        }}
        header={
          <div className="pt-3 px-2 border-b border-border pb-3 flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-foreground">{run.pay_period} Payroll Run</h2>
              <div className="flex flex-col text-xs text-muted-foreground font-normal">
                <span>
                  Disbursed on {run.disbursal_date ? format(new Date(run.disbursal_date), 'MMM dd, yyyy') : '—'} by{' '}
                  {run.created_by_name || 'System Owner'}
                </span>

                {/* Only render "Last edited" if run was actually edited */}
                {hasLastEdit && (
                  <span className="text-[11px] text-amber-600 dark:text-amber-400 font-medium">
                    Last edited by <strong>{run.last_edited_by_name || 'Manager'}</strong> on{' '}
                    {run.last_edited_at ? format(new Date(run.last_edited_at), 'MMM dd, yyyy - hh:mm a') : 'Recent'}
                  </span>
                )}
              </div>
            </div>

            <div className="flex flex-col-reverse lg:flex-row items-center gap-2">
              {activeAuditLine && (
                <Button
                  size="sm"
                  variant="outline"
                  radius="none"
                  onClick={() => setActiveAuditLine(null)}
                  className="gap-1 text-xs cursor-pointer h-8"
                >
                  <X className="h-3.5 w-3.5" /> 
                  <span className="lg:inline hidden">Close Audit View</span>
                </Button>
              )}

              {run.status === 'logged' ? (
                <span className="text-xs font-bold px-2.5 py-0.5 rounded-md bg-green-400/10 text-green-600 dark:text-green-400">
                  Logged
                </span>
              ) : (
                <span className="text-xs font-bold px-2.5 py-0.5 rounded-md bg-amber-400/10 text-amber-600 dark:text-amber-400">
                  {run.recipients_count} Logged • {run.total_recipients_count - run.recipients_count} Voided
                </span>
              )}
            </div>
          </div>
        }
        body={
          <div className="space-y-4 pb-4">
            {activeAuditLine ? (
              /* 2-Column Split Workspace Layout when inspecting Audit Trail */
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 pt-1">
                {/* Left Column (40%): Net Active Payout Banner + Monochromatic Audit Timeline */}
                <div className="lg:col-span-5 space-y-4 border-r border-border/40 pr-0 lg:pr-6">
                  {/* Aggregate Active Total Banner */}
                  <div className="p-4 rounded-md bg-card border border-border flex items-center justify-between shadow-xs">
                    <div>
                      <span className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">
                        Net Active Payout
                      </span>
                      <div className="text-2xl font-extrabold text-foreground mt-0.5">
                        <CurrencyDisplay amount={run.total_amount || 0} />
                      </div>
                      <span className="text-xs text-muted-foreground font-medium">
                        {run.recipients_count} Active Recipients ({run.platform_count} Platform •{' '}
                        {run.external_count} External)
                      </span>
                    </div>
                  </div>

                  {/* Audit History Timeline for Selected Employee */}
                  <AuditTrailTimeline
                    logs={activeAuditLine.logs}
                    defaultExpanded={true}
                    title={`Audit History — ${activeAuditLine.staff_name || activeAuditLine.recipient_name}`}
                  />
                </div>

                {/* Right Column (60%): Recipients Line-Item Table */}
                <div className="lg:col-span-7">
                  {/* <h3 className="text-xs font-bold uppercase !tracking-wider text-muted-foreground mb-2 flex items-center gap-1.5">
                    <FileText className="h-3.5 w-3.5" /> Line Items Breakdown ({items.length})
                  </h3> */}

                  <EnhancedTableComponent
                    columns={columns}
                    rows={rows}
                    isLoading={false}
                    showTopContent={false}
                    title=""
                    showSearch={false}
                    showFilter={false}
                    showAddButton={false}
                    containerStyles="min-h-[280px] max-h-[440px] overflow-y-auto px-2 py-0"
                    emptyStateTitle="No line items found"
                    emptyStateDescription="No recipients recorded for this payroll run."
                    mobileFriendly={false}
                  />
                </div>
              </div>
            ) : (
              /* Standard Single-Column Layout */
              <>
                {/* Aggregate Active Total Banner */}
                <div className="p-4 rounded-md bg-card border border-border flex items-center justify-between shadow-xs">
                  <div>
                    <span className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">
                      Net Active Payout
                    </span>
                    <div className="text-2xl font-extrabold text-foreground mt-0.5">
                      <CurrencyDisplay amount={run.total_amount || 0} />
                    </div>
                    <span className="text-xs text-muted-foreground font-medium">
                      {run.recipients_count} Active Recipients ({run.platform_count} Platform •{' '}
                      {run.external_count} External)
                    </span>
                  </div>
                </div>

                {/* Recipients Line-Item Table */}
                <div>
                  {/* <h3 className="text-xs font-bold uppercase !tracking-wider text-muted-foreground mb-2 flex items-center gap-1.5">
                    <FileText className="h-3.5 w-3.5" /> Line Items Breakdown ({items.length})
                  </h3> */}

                  <EnhancedTableComponent
                    columns={columns}
                    rows={rows}
                    isLoading={false}
                    showTopContent={false}
                    title=""
                    showSearch={false}
                    showFilter={false}
                    showAddButton={false}
                    containerStyles="min-h-[220px] max-h-[340px] overflow-y-auto px-2 py-0"
                    emptyStateTitle="No line items found"
                    emptyStateDescription="No recipients recorded for this payroll run."
                    mobileFriendly={false}
                  />
                </div>
              </>
            )}
          </div>
        }
      />

      {/* Shared Edit & Reverse modals */}
      <DisburalLineActions
        editingLine={editingLine}
        reversingLine={reversingLine}
        onCloseEdit={() => setEditingLine(null)}
        onCloseReverse={() => setReversingLine(null)}
        onSuccess={onRefresh}
      />
    </>
  );
}
