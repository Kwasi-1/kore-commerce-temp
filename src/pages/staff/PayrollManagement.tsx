import React, { useState, useEffect, useCallback } from 'react';
import PageLayout from '@/components/layout/PageLayout';
import EnhancedTableComponent from '@/components/shared/MainTableComponent';
import CustomModal from '@/components/modals/modal';
import DashboardCard from '@/components/ui/dashboard-card';
import SalaryProfileModal from '@/components/staff/SalaryProfileModal';
import ProcessPayrollModal from '@/components/staff/ProcessPayrollModal';
import AddOffPlatformStaffModal from '@/components/staff/AddOffPlatformStaffModal';
import { CurrencyDisplay } from '@/hooks';
import apiClient from '@/api/client';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { Banknote, Users, UserCheck, UserPlus, CreditCard, CheckCircle2, History } from 'lucide-react';
import clsx from 'clsx';
import { Button } from '@/components/ui/button';

export default function PayrollManagement() {
  const [activeTab, setActiveTab] = useState<'log' | 'profiles'>('log');
  const [disbursalLog, setDisbursalLog] = useState<any[]>([]);
  const [salaryProfiles, setSalaryProfiles] = useState<any[]>([]);
  const [staffMembers, setStaffMembers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Modals state
  const [isProcessModalOpen, setIsProcessModalOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isOffPlatformModalOpen, setIsOffPlatformModalOpen] = useState(false);
  const [editingProfile, setEditingProfile] = useState<any>(null);

  const fetchPayrollData = useCallback(async () => {
    setIsLoading(true);
    try {
      // 1. Fetch Staff list for salary mapping
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

  // Table Definitions
  const columnsLog = [
    { key: 'period', label: 'Pay Period' },
    { key: 'recipient', label: 'Staff Recipient' },
    { key: 'amount', label: 'Amount Paid' },
    { key: 'method', label: 'Payment Method' },
    { key: 'date', label: 'Disbursal Date' },
    { key: 'status', label: 'Status' },
  ];

  const rowsLog = disbursalLog.map((item: any) => ({
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
    amount: <span className="font-bold text-foreground"><CurrencyDisplay amount={item.amount} showStyling={false} /></span>,
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
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold bg-green-500/10 text-green-600 dark:text-green-400 border border-green-500/20">
        <CheckCircle2 className="h-3 w-3" /> Paid & Logged
      </span>
    ),
  }));

  const columnsProfiles = [
    { key: 'staff', label: 'Staff Member' },
    { key: 'role', label: 'Role / Type' },
    { key: 'base_amount', label: 'Base Pay' },
    { key: 'cycle', label: 'Structure' },
    { key: 'payment_info', label: 'Payment Account' },
  ];

  const rowsProfiles = salaryProfiles.map((p: any) => {
    const rowActions = [
      { key: 'edit', label: 'Edit Salary Profile', icon: 'mdi:pencil-outline' },
    ];

    return {
      id: p.id,
      staff: (
        <div className="flex flex-col">
          <span className="font-semibold text-foreground">{p.full_name || p.name}</span>
          {p.is_off_platform && (
            <span className="inline-block text-[10px] w-fit font-bold px-1.5 py-0.5 rounded bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20">
              External Staff
            </span>
          )}
        </div>
      ),
      role: (
        <span className="capitalize text-xs font-medium text-foreground px-2 py-0.5 rounded bg-muted/60">
          {p.role_title || p.role || 'Staff'}
        </span>
      ),
      base_amount: (
        <span className="font-bold text-foreground">
          <CurrencyDisplay amount={p.base_amount} showStyling={false} />
        </span>
      ),
      cycle: (
        <span className="capitalize text-xs font-semibold text-muted-foreground">
          {p.compensation_type?.replace(/_/g, ' ') || 'Monthly'}
        </span>
      ),
      payment_info: (
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

  const handleRowActionClickProfiles = (actionKey: string, row: any) => {
    if (actionKey === 'edit') {
      setEditingProfile(row.__record);
      setIsProfileModalOpen(true);
    }
  };

  // KPI Calculations
  const totalPayroll = salaryProfiles.reduce((acc, curr) => acc + (Number(curr.base_amount) || 0), 0);
  const platformPayroll = salaryProfiles
    .filter((p) => !p.is_off_platform)
    .reduce((acc, curr) => acc + (Number(curr.base_amount) || 0), 0);
  const offPlatformPayroll = salaryProfiles
    .filter((p) => p.is_off_platform)
    .reduce((acc, curr) => acc + (Number(curr.base_amount) || 0), 0);

  const lastDisbursal = disbursalLog[0]?.date_paid;

  return (
    <PageLayout
      title="Payroll & Salaries"
      actions={
        <div className="flex items-center gap-2">
          {/* Segmented View Switcher */}
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
              Salary Profiles ({salaryProfiles.length})
            </button>
          </div>
        </div>
      }
      constrainHeight={true}
    >
      {/* Summary Cards */}
      <div className="mb-4 lg:mb-5 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        <DashboardCard
          title="Total Monthly Payroll"
          value={isLoading ? '...' : <CurrencyDisplay amount={totalPayroll} />}
        />
        <DashboardCard
          title="Platform Staff Salaries"
          value={isLoading ? '...' : <CurrencyDisplay amount={platformPayroll} />}
        />
        <DashboardCard
          title="External Staff Wages"
          value={isLoading ? '...' : <CurrencyDisplay amount={offPlatformPayroll} />}
        />
        <DashboardCard
          title="Last Disbursal Date"
          value={
            isLoading ? '...' : lastDisbursal ? format(new Date(lastDisbursal), 'MMM dd, yyyy') : 'No runs yet'
          }
          valueStyle={!isLoading && 'lg:text-lg xl:text-lg font-header tracking-tight'}
        />
      </div>

      {activeTab === 'log' ? (
        <EnhancedTableComponent
          columns={columnsLog}
          rows={rowsLog}
          isLoading={isLoading}
          title=""

          showSearch={false}
          showFilter={false}

          showAddButton={true}
          addButtonText="Process Payroll Run"
          addButtonIcon="ph:paper-plane-tilt-bold"
          onAddButtonClick={() => setIsProcessModalOpen(true)}
          onRefresh={fetchPayrollData}

          mobileFriendly={true}
        />
      ) : (
        <EnhancedTableComponent
          columns={columnsProfiles}
          rows={rowsProfiles}
          isLoading={isLoading}
          title=""

          showSearch={false}
          showFilter={false}

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

      {/* Action to add Off-Platform Staff */}
      {activeTab === 'profiles' && (
      <div className="mt-4 flex items-center justify-between p-4 rounded-lg bg-card border border-border/80 text-xs">
        <div>
          <p className="font-bold text-foreground text-sm">Managing Cleaners, Security or Off-Platform Contractors?</p>
          <p className="text-muted-foreground">Add external staff to payroll without granting them POS login credentials.</p>
        </div>
        <Button
          size='sm'
          variant='outline'
          onClick={() => setIsOffPlatformModalOpen(true)}
          className=""
        >
          <UserPlus className="h-4 w-4" />
          Add External Staff
        </Button>
      </div>
      )}

      {/* Modal 1: Process Payroll */}
      <CustomModal
        isOpen={isProcessModalOpen}
        onOpenChange={() => setIsProcessModalOpen(!isProcessModalOpen)}
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
            onSuccess={() => {
              setIsProcessModalOpen(false);
              fetchPayrollData();
            }}
            onCancel={() => setIsProcessModalOpen(false)}
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
            <h2 className="text-xl font-bold">{editingProfile ? 'Edit Salary Profile' : 'Configure Salary Profile'}</h2>
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
    </PageLayout>
  );
}
