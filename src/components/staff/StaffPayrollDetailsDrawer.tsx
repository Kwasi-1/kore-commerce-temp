import React from 'react';
import CustomModal from '@/components/modals/modal';
import { CurrencyDisplay } from '@/hooks';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';
import { isProfileConfigured } from '@/utils/payrollHelpers';
import {
  User,
  ShieldCheck,
  Banknote,
  Calendar,
  Pencil,
  Send,
  Trash2,
  CheckCircle2,
  History,
} from 'lucide-react';
import EnhancedTableComponent from '@/components/shared/MainTableComponent';

interface StaffPayrollDetailsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  profile: any;
  disbursalHistory: any[];
  onEditProfile: (profile: any) => void;
  onSingleDisburse: (profile: any) => void;
  onDeleteProfile?: (profile: any) => void;
}

export default function StaffPayrollDetailsDrawer({
  isOpen,
  onClose,
  profile,
  disbursalHistory,
  onEditProfile,
  onSingleDisburse,
  onDeleteProfile,
}: StaffPayrollDetailsDrawerProps) {
  if (!profile) return null;

  const configured = isProfileConfigured(profile);

  // Filter disbursal history specifically for this employee
  const staffDisbursals = disbursalHistory.filter((item) => {
    if (profile.id && item.profile_id === profile.id) return true;
    if (profile.staff_id && item.staff_id === profile.staff_id) return true;
    const nameMatch =
      item.staff_name?.toLowerCase() === (profile.full_name || profile.name)?.toLowerCase() ||
      item.recipient_name?.toLowerCase() === (profile.full_name || profile.name)?.toLowerCase();
    return nameMatch;
  });

  const columnsHistory = [
    { key: 'period', label: 'Pay Period' },
    { key: 'amount', label: 'Amount' },
    { key: 'method', label: 'Method' },
    { key: 'date', label: 'Date Paid' },
  ];

  const rowsHistory = staffDisbursals.map((item: any) => ({
    id: item.id,
    period: <span className="font-semibold text-foreground">{item.pay_period || item.period || '—'}</span>,
    amount: (
      <span className="font-bold text-foreground">
        <CurrencyDisplay amount={item.amount} showStyling={false} />
      </span>
    ),
    method: (
      <span className="capitalize text-xs font-medium text-muted-foreground">
        {item.payment_method?.replace(/_/g, ' ') || 'Cash'}
      </span>
    ),
    date: (
      <span className="text-xs text-muted-foreground">
        {item.date_paid ? format(new Date(item.date_paid), 'MMM dd, yyyy') : '—'}
      </span>
    ),
  }));

  return (
    <CustomModal
      isOpen={isOpen}
      onOpenChange={onClose}
      placement="right"
      size="lg"
      classNames={{ base: "sm:w-[540px]" }}
      header={
        <div className="pt-2 lg:pt-3 px-2 flex items-center justify-between border-b border-border pb-3">
          <div>
            <h2 className="text-xl font-bold text-foreground">{profile.full_name || profile.name}</h2>
            <p className="text-xs text-muted-foreground font-normal">
              {profile.role_title || profile.role || 'Staff Member'} • {profile.is_off_platform ? 'External Staff' : 'Platform Staff'}
            </p>
          </div>
          {profile.is_off_platform ? (
            <span className="text-xs font-bold px-2 py-0.5 rounded bg-purple-400/10 text-purple-600 dark:text-purple-400">
              External Staff
            </span>
          ) : (
            <span className="text-xs font-bold px-2 py-0.5 rounded bg-muted/50 text-muted-foreground">
              Platform POS User
            </span>
          )}
        </div>
      }
      body={
        <div className="space-y-4 pb-4 !tracking-normal">
          {/* Base Salary Card */}
          <div className="p-4 rounded-md bg-card border border-border flex items-center justify-between shadow-xs">
            <div>
              <span className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Base Compensation</span>
              <div className="text-2xl font-extrabold text-foreground mt-0.5">
                {configured ? (
                  <CurrencyDisplay amount={profile.base_amount || 0} />
                ) : (
                  <span className="text-amber-600 dark:text-amber-400">Not set</span>
                )}
              </div>
              <span className="text-xs text-muted-foreground capitalize font-medium">
                {configured
                  ? `Structure: ${profile.compensation_type?.replace(/_/g, ' ') || 'Monthly Salary'}`
                  : 'Profile incomplete — configure salary to enable payroll'}
              </span>
            </div>

            {/* Quick Actions Bar */}
            <div className="flex items-center gap-1.5">
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  onClose();
                  onEditProfile(profile);
                }}
                className="gap-1 text-xs font-bold"
                title={configured ? 'Edit Salary Structure' : 'Complete Profile Setup'}
              >
                <Pencil className="h-3.5 w-3.5" /> {configured ? 'Edit' : 'Complete Setup'}
              </Button>

              {configured && (
                <Button
                  size="sm"
                  onClick={() => {
                    onClose();
                    onSingleDisburse(profile);
                  }}
                  className="gap-1 text-xs font-bold"
                  title="Pay Salary Now"
                >
                  <Send className="h-3.5 w-3.5" /> Pay Now
                </Button>
              )}
            </div>
          </div>

          {/* Incomplete profile banner */}
          {!configured && (
            <div className="flex items-start gap-2.5 p-3 rounded-lg border border-amber-400/30 bg-amber-400/5 text-xs">
              <CheckCircle2 className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
              <p className="text-amber-700 dark:text-amber-300">
                <strong>This staff member cannot be included in payroll runs</strong> until their salary profile is complete. Click <strong>Complete Setup</strong> above to finish configuration.
              </p>
            </div>
          )}

          {/* Account Details */}
          <div className="p-3.5 rounded-md bg-muted/30 space-y-2 text-sm">
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1">Disbursal Account Info</h3>
            
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground font-medium">Payment Method:</span>
              <span className="font-semibold text-foreground capitalize">
                {profile.payment_method?.replace(/_/g, ' ') || 'Cash'}
              </span>
            </div>

            {profile.payment_method !== 'cash' && (
              <>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground font-medium">
                    {profile.payment_method === 'bank_transfer' ? 'Bank Name:' : 'MoMo Provider:'}
                  </span>
                  <span className="font-bold text-foreground">
                    {profile.bank_or_momo_name || '—'}
                  </span>
                </div>

                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground font-medium">
                    {profile.payment_method === 'bank_transfer' ? 'Account Number:' : 'MoMo Number:'}
                  </span>
                  <span className="font-mono font-bold text-foreground">
                    {profile.account_number || '—'}
                  </span>
                </div>
              </>
            )}
          </div>

          {/* Personal Disbursal History Table */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <History className="h-3.5 w-3.5" /> Disbursal History ({staffDisbursals.length})
              </h3>
            </div>

            <EnhancedTableComponent
              columns={columnsHistory}
              rows={rowsHistory}
              isLoading={false}
              showTopContent={false}
              title=""
              showSearch={false}
              showFilter={false}
              showAddButton={false}
              containerStyles="min-h-[180px] max-h-[260px] overflow-y-auto p-2"
              emptyStateTitle="No disbursals yet"
              emptyStateDescription="No past salary payments found for this employee."
              mobileFriendly={false}
            />
          </div>

          {/* Danger zone for external staff */}
          {profile.is_off_platform && onDeleteProfile && (
            <div className="pt-3 border-t border-border flex justify-between items-center text-xs">
              <span className="text-muted-foreground">Remove external contractor from payroll roster?</span>
              <Button
                size="sm"
                variant="destructive"
                onClick={() => {
                  onClose();
                  onDeleteProfile(profile);
                }}
                className="gap-1 text-xs font-bold"
              >
                <Trash2 className="h-3.5 w-3.5" /> Remove External Staff
              </Button>
            </div>
          )}
        </div>
      }
    />
  );
}
