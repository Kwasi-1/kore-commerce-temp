import React, { useState, useEffect, useCallback } from 'react';
import PageLayout from '@/components/layout/PageLayout';
import EnhancedTableComponent from '@/components/shared/MainTableComponent';
import CustomModal from '@/components/modals/modal';
import DashboardCard from '@/components/ui/dashboard-card';
import SalaryProfileModal from '@/components/staff/SalaryProfileModal';
import ProcessPayrollModal from '@/components/staff/ProcessPayrollModal';
import AddOffPlatformStaffModal from '@/components/staff/AddOffPlatformStaffModal';
import PaySlipDrawer from '@/components/staff/PaySlipDrawer';
import { CurrencyDisplay } from '@/hooks';
import apiClient from '@/api/client';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import {
  Banknote,
  Users,
  UserPlus,
  CheckCircle2,
  History,
} from 'lucide-react';
import clsx from 'clsx';
import { Button } from '@/components/ui/button';

export default function PayrollManagement() {
  const [activeTab, setActiveTab] = useState<'log' | 'profiles'>('log');
  const [disbursalLog, setDisbursalLog] = useState<any[]>([]);
  const [salaryProfiles, setSalaryProfiles] = useState<any[]>([]);
  const [staffMembers, setStaffMembers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Filters state
  const [selectedMonth, setSelectedMonth] = useState<string>('all');
  const [profileFilter, setProfileFilter] = useState<'all' | 'platform' | 'external'>('all');

  // Modals state
  const [isProcessModalOpen, setIsProcessModalOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isOffPlatformModalOpen, setIsOffPlatformModalOpen] = useState(false);
  const [editingProfile, setEditingProfile] = useState<any>(null);
  const [singleRecipientId, setSingleRecipientId] = useState<string | undefined>(undefined);

  // Pay Slip Drawer state
  const [isPaySlipOpen, setIsPaySlipOpen] = useState(false);
  const [selectedDisbursal, setSelectedDisbursal] = useState<any>(null);

  const fetchPayrollData = useCallback(async () => {
    setIsLoading(true);
    try {
      // 1. Fetch active Platform Staff
      const staffRes = await apiClient.get('/tenant/staff');
      const staffData = staffRes.data.success?.data?.staff || staffRes.data.data?.staff || [];
      setStaffMembers(staffData);

      // 2. Fetch Payroll Data (Log and Profiles)
      const payrollRes = await apiClient.get('/tenant/payroll');
      const payload = payrollRes.data.success?.data || payrollRes.data.data || {};

      const log = payload.disbursals || payload.log || [];
      const profiles = payload.profiles || payload.salary_profiles || [];

      setDisbursalLog(log);
      setSalaryProfiles(profiles);
    } catch (error) {
      console.error('Failed to fetch payroll data:', error);
      toast.error('Failed to load payroll details');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPayrollData();
  }, [fetchPayrollData]);

  // Combine Platform Staff with Salary Profiles for automatic roster sync
  const unifiedProfiles = React.useMemo(() => {
    const configuredStaffIds = new Set(
      salaryProfiles.filter((p) => !p.is_off_platform && p.staff_id).map((p) => p.staff_id)
    );

    // Platform staff who don't have a salary profile configured yet
    const unconfiguredPlatformStaff = staffMembers
      .filter((s) => !configuredStaffIds.has(s.id))
      .map((s) => ({
        id: `unconfig_${s.id}`,
        staff_id: s.id,
        full_name: s.name || `${s.first_name || ''} ${s.last_name || ''}`.trim() || 'Staff User',
        name: s.name || `${s.first_name || ''} ${s.last_name || ''}`.trim() || 'Staff User',
        role_title: s.role ? s.role.toUpperCase() : 'Staff',
        is_off_platform: false,
        compensation_type: 'monthly_salary',
        base_amount: 0,
        payment_method: 'bank_transfer',
        bank_or_momo_name: '',
        account_number: '',
        is_unconfigured: true,
      }));

    const merged = [...salaryProfiles, ...unconfiguredPlatformStaff];

    if (profileFilter === 'platform') return merged.filter((p) => !p.is_off_platform);
    if (profileFilter === 'external') return merged.filter((p) => p.is_off_platform);
    return merged;
  }, [salaryProfiles, staffMembers, profileFilter]);

  // Filter Disbursal Log by selected month
  const filteredDisbursals = React.useMemo(() => {
    if (!selectedMonth || selectedMonth === 'all') return disbursalLog;
    return disbursalLog.filter((item) => {
      const period = item.pay_period || item.period || '';
      if (period.toLowerCase() === selectedMonth.toLowerCase()) return true;
      if (item.date_paid) {
        const itemMonth = format(new Date(item.date_paid), 'MMMM yyyy');
        return itemMonth.toLowerCase() === selectedMonth.toLowerCase();
      }
      return false;
    });
  }, [disbursalLog, selectedMonth]);

  // -------------------------------------------------------------
  // Table Definitions
  // -------------------------------------------------------------

  const columnsLog = [
    { key: 'period', label: 'Pay Period' },
    { key: 'recipient', label: 'Staff Recipient' },
    { key: 'amount', label: 'Amount Paid' },
    { key: 'method', label: 'Payment Method' },
    { key: 'date', label: 'Disbursal Date' },
    { key: 'status', label: 'Status' },
  ];

  const rowsLog = filteredDisbursals.map((item: any) => {
    const rowActions = [
      { key: 'view_slip', label: 'View Pay Slip', icon: 'mdi:eye-outline' },
    ];

    return {
      id: item.id,
      period: <span className="font-semibold text-foreground">{item.pay_period || item.period || '—'}</span>,
      recipient: (
        <div className="flex flex-col">
          <span className="font-semibold text-foreground">{item.staff_name || item.recipient_name || 'Staff Member'}</span>
          <span className="text-xs text-muted-foreground">
            {item.is_off_platform ? 'External / Contractor' : 'Platform Staff'}
          </span>
        </div>
      ),
      amount: (
        <span className="font-bold text-foreground">
          <CurrencyDisplay amount={item.amount} showStyling={false} />
        </span>
      ),
      method: (
        <span className="capitalize text-xs font-semibold text-muted-foreground px-2 py-0.5 rounded bg-muted/60">
          {item.payment_method?.replace(/_/g, ' ') || 'Cash'}
        </span>
      ),
      date: (
        <span className="text-xs text-muted-foreground font-medium">
          {item.date_paid ? format(new Date(item.date_paid), 'MMM dd, yyyy') : '—'}
        </span>
      ),
      status: (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold bg-green-400/10 text-green-600 dark:text-green-400">
          <CheckCircle2 className="h-3 w-3" /> Paid & Logged
        </span>
      ),
      rowActions,
      __record: item,
    };
  });

  const columnsProfiles = [
    { key: 'staff', label: 'Staff Member' },
    { key: 'role', label: 'Role / Type' },
    { key: 'base_amount', label: 'Base Pay' },
    { key: 'cycle', label: 'Structure' },
    { key: 'payment_info', label: 'Payment Account' },
  ];

  const rowsProfiles = unifiedProfiles.map((p: any) => {
    const rowActions = p.is_unconfigured
      ? [{ key: 'setup_salary', label: 'Setup Salary', icon: 'mdi:plus-circle-outline' }]
      : [
          { key: 'pay_now', label: 'Pay Now (Single Disbursal)', icon: 'mdi:cash-send' },
          { key: 'edit', label: 'Edit Salary Profile', icon: 'mdi:pencil-outline' },
        ];

    return {
      id: p.id,
      staff: (
        <div className="flex flex-col">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-foreground">{p.full_name || p.name}</span>
            {p.is_unconfigured && (
              <span className="inline-block text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-400/10 text-amber-600 dark:text-amber-400">
                Unconfigured
              </span>
            )}
            {p.is_off_platform && (
              <span className="inline-block text-[10px] font-bold px-1.5 py-0.5 rounded bg-purple-400/10 text-purple-600 dark:text-purple-400">
                External Staff
              </span>
            )}
          </div>
        </div>
      ),
      role: (
        <span className="capitalize text-xs font-medium text-foreground px-2 py-0.5 rounded bg-muted/60">
          {p.role_title || p.role || 'Staff'}
        </span>
      ),
      base_amount: p.is_unconfigured ? (
        <span className="text-xs text-muted-foreground italic">Not set</span>
      ) : (
        <span className="font-bold text-foreground">
          <CurrencyDisplay amount={p.base_amount} showStyling={false} />
        </span>
      ),
      cycle: (
        <span className="capitalize text-xs font-semibold text-muted-foreground">
          {p.compensation_type?.replace(/_/g, ' ') || 'Monthly'}
        </span>
      ),
      payment_info: p.is_unconfigured ? (
        <span className="text-xs text-muted-foreground italic">No account configured</span>
      ) : (
        <div className="flex flex-col text-xs">
          <span className="font-semibold capitalize text-foreground">{p.payment_method?.replace(/_/g, ' ')}</span>
          {p.account_number && (
            <span className="text-muted-foreground">
              {p.bank_or_momo_name ? `${p.bank_or_momo_name} - ` : ''}{p.account_number}
            </span>
          )}
        </div>
      ),
      rowActions,
      __record: p,
    };
  });

  // Action Click Handlers
  const handleRowActionClickLog = (actionKey: string, row: any) => {
    if (actionKey === 'view_slip') {
      setSelectedDisbursal(row.__record);
      setIsPaySlipOpen(true);
    }
  };

  const handleRowActionClickProfiles = (actionKey: string, row: any) => {
    const record = row.__record;

    if (actionKey === 'setup_salary' || actionKey === 'edit') {
      setEditingProfile(record.is_unconfigured ? { staff_id: record.staff_id } : record);
      setIsProfileModalOpen(true);
    } else if (actionKey === 'pay_now') {
      setSingleRecipientId(record.id);
      setIsProcessModalOpen(true);
    }
  };

  // KPI Calculations
  const monthTotalDisbursed = filteredDisbursals.reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0);
  const platformDisbursed = filteredDisbursals
    .filter((d) => !d.is_off_platform)
    .reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0);
  const externalDisbursed = filteredDisbursals
    .filter((d) => d.is_off_platform)
    .reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0);

  const totalMonthlyPayroll = salaryProfiles.reduce((acc, curr) => acc + (Number(curr.base_amount) || 0), 0);
  const platformPayroll = salaryProfiles
    .filter((p) => !p.is_off_platform)
    .reduce((acc, curr) => acc + (Number(curr.base_amount) || 0), 0);
  const externalPayroll = salaryProfiles
    .filter((p) => p.is_off_platform)
    .reduce((acc, curr) => acc + (Number(curr.base_amount) || 0), 0);

  const configuredCount = salaryProfiles.length;
  const totalRosterCount = unifiedProfiles.length;
  const lastDisbursalDate = disbursalLog[0]?.date_paid;

  // Filter options for MainTableComponent
  const logFilterOptions = [
    { name: 'All Months', uid: 'all' },
    { name: 'August 2026', uid: 'August 2026' },
    { name: 'July 2026', uid: 'July 2026' },
    { name: 'June 2026', uid: 'June 2026' },
  ];

  const profileFilterOptions = [
    { name: 'All Roster', uid: 'all' },
    { name: 'Platform Staff', uid: 'platform' },
    { name: 'External Staff', uid: 'external' },
  ];

  return (
    <PageLayout
      title="Payroll & Salaries"
      actions={
        /* Clean segmented tab switcher in page header */
        <div className="inline-flex items-center bg-muted/80 p-[3px] rounded-lg border border-border/60 text-[12px] font-medium">
          <button
            type="button"
            onClick={() => setActiveTab('log')}
            className={clsx(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-all cursor-pointer font-semibold',
              activeTab === 'log'
                ? 'bg-background text-foreground shadow-xs'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            {/* <History className="h-3.5 w-3.5" /> */}
            Disbursal Log
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('profiles')}
            className={clsx(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-all cursor-pointer font-semibold',
              activeTab === 'profiles'
                ? 'bg-background text-foreground shadow-xs'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            {/* <Users className="h-3.5 w-3.5" /> */}
            Salary Profiles ({totalRosterCount})
          </button>
        </div>
      }
      constrainHeight={true}
    >
      {/* Context-Aware KPI Summary Cards */}
      <div className="mb-4 lg:mb-5 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        {activeTab === 'log' ? (
          <>
            <DashboardCard
              title={selectedMonth === 'all' ? 'Total Disbursed' : `Disbursed (${selectedMonth})`}
              value={isLoading ? '...' : <CurrencyDisplay amount={monthTotalDisbursed} />}
            />
            <DashboardCard
              title="Platform Staff Payouts"
              value={isLoading ? '...' : <CurrencyDisplay amount={platformDisbursed} />}
            />
            <DashboardCard
              title="External Staff Payouts"
              value={isLoading ? '...' : <CurrencyDisplay amount={externalDisbursed} />}
            />
            <DashboardCard
              title="Last Disbursal Date"
              value={
                isLoading ? '...' : lastDisbursalDate ? format(new Date(lastDisbursalDate), 'MMM dd, yyyy') : 'No runs yet'
              }
              valueStyle={!isLoading && 'lg:text-lg xl:text-lg font-header tracking-tight'}
            />
          </>
        ) : (
          <>
            <DashboardCard
              title="Total Monthly Payroll"
              value={isLoading ? '...' : <CurrencyDisplay amount={totalMonthlyPayroll} />}
            />
            <DashboardCard
              title="Platform Staff Salaries"
              value={isLoading ? '...' : <CurrencyDisplay amount={platformPayroll} />}
            />
            <DashboardCard
              title="External Staff Wages"
              value={isLoading ? '...' : <CurrencyDisplay amount={externalPayroll} />}
            />
            <DashboardCard
              title="Roster Status"
              value={isLoading ? '...' : `${configuredCount} of ${totalRosterCount} Configured`}
              valueStyle={!isLoading && 'lg:text-lg xl:text-lg font-header tracking-tight'}
            />
          </>
        )}
      </div>

      {/* Main Table Component with integrated filters and actions */}
      {activeTab === 'log' ? (
        <EnhancedTableComponent
          columns={columnsLog}
          rows={rowsLog}
          isLoading={isLoading}
          title=""
          showSearch={true}
          searchPlaceholder="Search disbursals..."
          showFilter={true}
          filterLabel={selectedMonth === 'all' ? 'Pay Period' : selectedMonth}
          filterOptions={logFilterOptions}
          filterValue={new Set([selectedMonth])}
          onFilterChange={(keys) => {
            const selected = Array.from(keys)[0]?.toString() || 'all';
            setSelectedMonth(selected);
          }}
          showAddButton={true}
          addButtonText="Process Payroll Run"
          addButtonIcon="ph:paper-plane-tilt-bold"
          onAddButtonClick={() => {
            setSingleRecipientId(undefined);
            setIsProcessModalOpen(true);
          }}
          onRefresh={fetchPayrollData}
          onRowActionClick={handleRowActionClickLog}
          mobileFriendly={true}
        />
      ) : (
        <EnhancedTableComponent
          columns={columnsProfiles}
          rows={rowsProfiles}
          isLoading={isLoading}
          title=""
          showSearch={true}
          searchPlaceholder="Search staff roster..."
          showFilter={true}
          filterLabel={
            profileFilter === 'all'
              ? 'Roster: All'
              : profileFilter === 'platform'
              ? 'Roster: Platform'
              : 'Roster: External'
          }
          filterOptions={profileFilterOptions}
          filterValue={new Set([profileFilter])}
          onFilterChange={(keys) => {
            const selected = Array.from(keys)[0]?.toString() || 'all';
            setProfileFilter(selected as any);
          }}
          topActions={[
            {
              title: 'Add External Staff',
              icon: 'solar:user-plus-bold',
              variant: 'bordered',
              onPress: () => setIsOffPlatformModalOpen(true),
              className: "border-1 rounded"
            },
          ]}
          showAddButton={true}
          addButtonText="Configure Salary"
          addButtonIcon="ph:plus-bold"
          onAddButtonClick={() => {
            setEditingProfile(null);
            setIsProfileModalOpen(true);
          }}
          onRefresh={fetchPayrollData}
          onRowActionClick={handleRowActionClickProfiles}
          mobileFriendly={true}
        />
      )}

      {/* Action Banner for Adding Off-Platform Staff (Profiles tab only) */}
      {/* {activeTab === 'profiles' && (
        <div className="mt-4 flex items-center justify-between p-4 rounded-lg bg-card border border-border/80 text-xs shadow-xs">
          <div>
            <p className="font-bold text-foreground text-sm">Managing Cleaners, Security or Off-Platform Contractors?</p>
            <p className="text-muted-foreground">Add external staff to payroll without granting them POS login credentials.</p>
          </div>
          <button
            type="button"
            onClick={() => setIsOffPlatformModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-muted hover:bg-muted/80 text-foreground font-bold transition-all cursor-pointer"
          >
            <UserPlus className="h-4 w-4" />
            Add External Staff
          </button>
        </div>
      )} */}

      {/* Modal 1: Process Payroll */}
      <CustomModal
        isOpen={isProcessModalOpen}
        onOpenChange={() => {
          setIsProcessModalOpen(!isProcessModalOpen);
          if (isProcessModalOpen) setSingleRecipientId(undefined);
        }}
        placement="right"
        size="lg"
        classNames={{ base: "sm:w-[520px]" }}
        header={
          <div className="pt-4 px-2">
            <h2 className="text-xl font-bold">Process Payroll Run</h2>
            <p className="text-sm text-muted-foreground font-normal">Disburse salaries for selected staff and log expenses.</p>
          </div>
        }
        body={
          <ProcessPayrollModal
            profiles={salaryProfiles}
            initialSelectedId={singleRecipientId}
            onSuccess={() => {
              setIsProcessModalOpen(false);
              setSingleRecipientId(undefined);
              fetchPayrollData();
            }}
            onCancel={() => {
              setIsProcessModalOpen(false);
              setSingleRecipientId(undefined);
            }}
          />
        }
      />

      {/* Modal 2: Salary Profile */}
      <CustomModal
        isOpen={isProfileModalOpen}
        onOpenChange={() => {
          setIsProfileModalOpen(!isProfileModalOpen);
          if (isProfileModalOpen) setEditingProfile(null);
        }}
        placement="right"
        size="lg"
        classNames={{ base: "sm:w-[500px]" }}
        header={
          <div className="pt-4 px-2">
            <h2 className="text-xl font-bold">{editingProfile?.id ? 'Edit Salary Profile' : 'Configure Salary Profile'}</h2>
            <p className="text-sm text-muted-foreground font-normal">Set base compensation and payment details.</p>
          </div>
        }
        body={
          <SalaryProfileModal
            initialData={editingProfile}
            staffList={staffMembers}
            onSuccess={() => {
              setIsProfileModalOpen(false);
              setEditingProfile(null);
              fetchPayrollData();
            }}
            onCancel={() => {
              setIsProfileModalOpen(false);
              setEditingProfile(null);
            }}
          />
        }
      />

      {/* Modal 3: Off-Platform Staff */}
      <CustomModal
        isOpen={isOffPlatformModalOpen}
        onOpenChange={() => setIsOffPlatformModalOpen(!isOffPlatformModalOpen)}
        placement="right"
        size="lg"
        classNames={{ base: "sm:w-[500px]" }}
        header={
          <div className="pt-4 px-2">
            <h2 className="text-xl font-bold">Add External Staff Member</h2>
            <p className="text-sm text-muted-foreground font-normal">Register off-platform staff for payroll records.</p>
          </div>
        }
        body={
          <AddOffPlatformStaffModal
            onSuccess={() => {
              setIsOffPlatformModalOpen(false);
              fetchPayrollData();
            }}
            onCancel={() => setIsOffPlatformModalOpen(false)}
          />
        }
      />

      {/* Drawer: Pay Slip View */}
      <PaySlipDrawer
        isOpen={isPaySlipOpen}
        onClose={() => {
          setIsPaySlipOpen(false);
          setSelectedDisbursal(null);
        }}
        disbursal={selectedDisbursal}
      />
    </PageLayout>
  );
}
