import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import PageLayout from '@/components/layout/PageLayout';
import EnhancedTableComponent from '@/components/shared/MainTableComponent';
import { DateFilterValue } from '@/components/shared/custom-only-date-filter';
import CustomModal from '@/components/modals/modal';
import DashboardCard from '@/components/ui/dashboard-card';
import SalaryProfileModal from '@/components/staff/SalaryProfileModal';
import ProcessPayrollModal from '@/components/staff/ProcessPayrollModal';
import MobilePayrollRunModal from '@/components/staff/MobilePayrollRunModal';
import AddOffPlatformStaffModal from '@/components/staff/AddOffPlatformStaffModal';
import PaySlipDrawer from '@/components/staff/PaySlipDrawer';
import StaffPayrollDetailsDrawer from '@/components/staff/StaffPayrollDetailsDrawer';
import PayrollRunDetailsDrawer from '@/components/staff/PayrollRunDetailsDrawer';
import ImportStaffToPayrollModal from '@/components/staff/ImportStaffToPayrollModal';
import { RemoveSalaryProfileModal } from '@/components/staff/RemoveSalaryProfileModal';
import { CurrencyDisplay } from '@/hooks';
import { useIsMobile } from '@/hooks/useScreenSize';
import { isProfileConfigured } from '@/utils/payrollHelpers';
import apiClient from '@/api/client';
import toast from 'react-hot-toast';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import {
  Banknote,
  Users,
  UserPlus,
  CheckCircle2,
  History,
  XCircle,
  AlertCircle,
  Send,
  Plus,
  RefreshCw,
  CreditCard,
  Building2,
  ChevronRight,
  Pencil,
  Trash2,
} from 'lucide-react';
import clsx from 'clsx';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import {
  MobileDashboardWrapper,
  MobileHeroCard,
  MobileMetricPill,
  MobileActionCapsuleBar,
  MobileActivitySheet,
} from '@/components/mobile-dashboard';

export default function PayrollManagement() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const isMobile = useIsMobile();

  const isRunRoute = location.pathname.startsWith('/staff/payroll/run');
  const staffIdParam = searchParams.get('staff_id') || undefined;
  const tabParam = searchParams.get('tab');

  const [isMobileView, setIsMobileView] = useState<boolean>(() => window.innerWidth < 1028);

  useEffect(() => {
    const handleResize = () => setIsMobileView(window.innerWidth < 1028);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const [activeTab, setActiveTab] = useState<'log' | 'profiles'>(tabParam === 'profiles' ? 'profiles' : 'log');
  const [payrollRuns, setPayrollRuns] = useState<any[]>([]);
  const [disbursalLog, setDisbursalLog] = useState<any[]>([]);
  const [salaryProfiles, setSalaryProfiles] = useState<any[]>([]);
  const [staffMembers, setStaffMembers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Search & Mobile Tabs state
  const [searchLogQuery, setSearchLogQuery] = useState('');
  const [searchProfilesQuery, setSearchProfilesQuery] = useState('');
  const [mobileLogTab, setMobileLogTab] = useState('all');
  const [mobileProfilesTab, setMobileProfilesTab] = useState('all');

  const handleTabChange = (tab: 'log' | 'profiles') => {
    setActiveTab(tab);
    const newParams = new URLSearchParams(searchParams);
    if (tab === 'profiles') {
      newParams.set('tab', 'profiles');
    } else {
      newParams.delete('tab');
    }
    navigate(`?${newParams.toString()}`, { replace: true });
  };

  // Date Filter state
  const [dateFilter, setDateFilter] = useState<DateFilterValue>({
    active: 'this_month',
    start_date: startOfMonth(new Date()),
    end_date: endOfMonth(new Date()),
  });

  const [profileFilter, setProfileFilter] = useState<'all' | 'platform' | 'external'>('all');

  // Modals state
  const [isProcessModalOpen, setIsProcessModalOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isOffPlatformModalOpen, setIsOffPlatformModalOpen] = useState(false);
  const [isImportStaffModalOpen, setIsImportStaffModalOpen] = useState(false);
  const [isRemoveModalOpen, setIsRemoveModalOpen] = useState(false);
  const [profileToDelete, setProfileToDelete] = useState<any>(null);
  const [isDeletingProfile, setIsDeletingProfile] = useState(false);
  const [editingProfile, setEditingProfile] = useState<any>(null);
  const [singleRecipientId, setSingleRecipientId] = useState<string | undefined>(undefined);

  // Drawers state
  const [isPaySlipOpen, setIsPaySlipOpen] = useState(false);
  const [selectedDisbursal, setSelectedDisbursal] = useState<any>(null);

  const [isRunDetailsOpen, setIsRunDetailsOpen] = useState(false);
  const [selectedRun, setSelectedRun] = useState<any>(null);

  const [isStaffDetailsOpen, setIsStaffDetailsOpen] = useState(false);
  const [selectedStaffProfile, setSelectedStaffProfile] = useState<any>(null);

  const fetchPayrollData = useCallback(async () => {
    setIsLoading(true);
    try {
      // 1. Fetch active Platform Staff
      const staffRes = await apiClient.get('/tenant/staff');
      const staffData = staffRes.data.success?.data?.staff || staffRes.data.data?.staff || [];
      setStaffMembers(staffData);

      // 2. Fetch Payroll Data with Date Range
      const params = new URLSearchParams();
      if (dateFilter.start_date) {
        params.set('start_date', dateFilter.start_date.toISOString());
      }
      if (dateFilter.end_date) {
        params.set('end_date', dateFilter.end_date.toISOString());
      }

      const res = await apiClient.get(`/tenant/payroll?${params.toString()}`);
      const data = res.data.success?.data || res.data.data || {};

      setPayrollRuns(data.payroll_runs || data.runs || []);
      setDisbursalLog(data.disbursal_log || data.disbursals || []);
      setSalaryProfiles(data.salary_profiles || data.profiles || []);
    } catch (error) {
      console.error('Failed to fetch payroll data:', error);
      toast.error('Failed to load payroll details');
    } finally {
      setIsLoading(false);
    }
  }, [dateFilter]);

  useEffect(() => {
    fetchPayrollData();
  }, [fetchPayrollData]);

  // Combined Log Rows: Merging Batch Runs + Standalone Single Payouts
  const combinedLogRows = useMemo(() => {
    const runIds = new Set(
      payrollRuns.flatMap((r) => r.disbursals?.map((d: any) => d.id) || [])
    );

    const runRows = payrollRuns.map((r) => ({
      id: r.id,
      is_run: true,
      pay_period: r.name || r.pay_period || 'Payroll Run',
      recipients_text: `${r.recipient_count || r.disbursals?.length || 0} Recipients`,
      platform_count: r.disbursals?.filter((d: any) => !d.is_off_platform).length || 0,
      external_count: r.disbursals?.filter((d: any) => d.is_off_platform).length || 0,
      amount: r.total_amount || 0,
      payment_method: 'Multiple Methods',
      disbursal_date: r.disbursal_date,
      status: r.status || 'logged',
      __record: r,
    }));

    const singleDisbursals = disbursalLog.filter((d) => !runIds.has(d.id));
    const singleRows = singleDisbursals.map((d) => ({
      id: d.id,
      is_run: false,
      pay_period: d.pay_period || d.period || '—',
      recipient_name: d.staff_name || d.recipient_name || 'Staff Member',
      is_off_platform: d.is_off_platform,
      amount: d.amount || 0,
      payment_method: d.payment_method || 'cash',
      disbursal_date: d.date_paid,
      status: d.status || 'logged',
      __record: d,
    }));

    const combined = [...runRows, ...singleRows].sort((a, b) => {
      const timeA = a.disbursal_date ? new Date(a.disbursal_date).getTime() : 0;
      const timeB = b.disbursal_date ? new Date(b.disbursal_date).getTime() : 0;
      return timeB - timeA;
    });

    if (dateFilter.active === 'all_time' || (!dateFilter.start_date && !dateFilter.end_date)) {
      return combined;
    }

    const startTime = dateFilter.start_date ? new Date(dateFilter.start_date).getTime() : 0;
    const endTime = dateFilter.end_date ? new Date(dateFilter.end_date).getTime() : Infinity;

    return combined.filter((row) => {
      if (!row.disbursal_date) return true;
      const t = new Date(row.disbursal_date).getTime();
      return t >= startTime && t <= endTime;
    });
  }, [payrollRuns, disbursalLog, dateFilter]);

  // Mobile Filtered Disbursal Log
  const filteredMobileLog = useMemo(() => {
    return combinedLogRows.filter((row: any) => {
      if (searchLogQuery.trim()) {
        const q = searchLogQuery.toLowerCase();
        const matchPeriod = row.pay_period?.toLowerCase().includes(q);
        const matchRecip = row.recipient_name?.toLowerCase().includes(q);
        if (!matchPeriod && !matchRecip) return false;
      }
      if (mobileLogTab === 'logged') return row.status === 'logged';
      if (mobileLogTab === 'voided') return row.status === 'voided';
      return true;
    });
  }, [combinedLogRows, searchLogQuery, mobileLogTab]);

  // Salary profiles filtered by profileFilter without synthesizing artificial unconfigured rows
  const filteredProfiles = useMemo(() => {
    if (profileFilter === 'platform') return salaryProfiles.filter((p) => !p.is_off_platform);
    if (profileFilter === 'external') return salaryProfiles.filter((p) => p.is_off_platform);
    return salaryProfiles;
  }, [salaryProfiles, profileFilter]);

  // Mobile Filtered Profiles
  const filteredMobileProfiles = useMemo(() => {
    return salaryProfiles.filter((p: any) => {
      if (searchProfilesQuery.trim()) {
        const q = searchProfilesQuery.toLowerCase();
        const name = (p.full_name || p.name || '').toLowerCase();
        const role = (p.role_title || '').toLowerCase();
        if (!name.includes(q) && !role.includes(q)) return false;
      }
      if (mobileProfilesTab === 'platform') return !p.is_off_platform;
      if (mobileProfilesTab === 'external') return p.is_off_platform;
      if (mobileProfilesTab === 'unconfigured') return !isProfileConfigured(p);
      return true;
    });
  }, [salaryProfiles, searchProfilesQuery, mobileProfilesTab]);

  // Delete staff profile handler
  const handleDeleteSalaryProfile = async (profile?: any) => {
    const target = profile || profileToDelete;
    if (!target?.id) return;
    setIsDeletingProfile(true);
    try {
      await apiClient.delete(`/tenant/payroll/profile/${target.id}`);
      toast.success('Staff profile removed from payroll');
      setIsRemoveModalOpen(false);
      setProfileToDelete(null);
      setIsStaffDetailsOpen(false);
      fetchPayrollData();
    } catch (error) {
      console.error('Delete profile error:', error);
      toast.error('Failed to remove staff profile');
    } finally {
      setIsDeletingProfile(false);
    }
  };

  const columnsLog = [
    { key: 'period', label: 'Pay Period' },
    { key: 'recipient', label: 'Recipient / Count' },
    { key: 'amount', label: 'Total Amount' },
    { key: 'method', label: 'Payment Method' },
    { key: 'date', label: 'Disbursal Date' },
    { key: 'status', label: 'Status' },
  ];

  const rowsLog = combinedLogRows.map((row: any) => {
    const isEdited = Boolean(row.__record?.last_edited_by_name || row.__record?.last_edited_at || row.__record?.edit_reason);
    const rowActions = [
      { key: 'view_details', label: row.is_run ? 'View Run Breakdown' : 'View Pay Slip', icon: 'mdi:eye-outline' },
    ];
    return {
      id: row.id,
      period: <span className="font-semibold text-foreground">{row.pay_period}</span>,
      recipient: row.is_run ? (
        <div className="flex flex-col">
          <span className="font-bold text-foreground">{row.recipients_text}</span>
          <span className="text-xs text-muted-foreground">{row.platform_count} Platform • {row.external_count} External</span>
        </div>
      ) : (
        <div className="flex flex-col">
          <span className="font-semibold text-foreground">{row.recipient_name}</span>
          <span className="text-xs text-muted-foreground">{row.is_off_platform ? 'External / Contractor' : 'Platform Staff'}</span>
        </div>
      ),
      amount: <span className="font-bold text-foreground"><CurrencyDisplay amount={row.amount} showStyling={false} /></span>,
      method: <span className="capitalize text-xs font-semibold text-muted-foreground px-2 py-1.5 rounded bg-muted/60">{row.payment_method?.replace(/_/g, ' ') || 'Cash'}</span>,
      date: <span className="text-[12px] text-muted-foreground font-medium">{row.disbursal_date ? format(new Date(row.disbursal_date), 'MMM dd, yyyy') : '—'}</span>,
      status: (
        <div className="flex items-center gap-1.5">
          {row.is_run ? (
            row.status === 'logged' ? (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold bg-green-400/10 text-green-600 dark:text-green-400">
                <CheckCircle2 className="h-3 w-3" /> Logged
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold bg-amber-400/10 text-amber-600 dark:text-amber-400">
                <AlertCircle className="h-3 w-3" /> {row.recipients_text} Logged
              </span>
            )
          ) : row.status === 'voided' ? (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold bg-rose-400/10 text-rose-600 dark:text-rose-400">
              <XCircle className="h-3 w-3" /> Voided
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold bg-green-400/10 text-green-600 dark:text-green-400">
              <CheckCircle2 className="h-3 w-3" /> Paid &amp; Logged
            </span>
          )}
          {isEdited && <span className="inline-flex items-center text-[10px] font-bold px-1.5 py-0.5 rounded text-amber-600 dark:text-amber-400 shrink-0">Edited</span>}
        </div>
      ),
      rowActions,
      __record: row.__record,
      __is_run: row.is_run,
    };
  });

  const columnsProfiles = [
    { key: 'staff', label: 'Staff Member' },
    { key: 'role', label: 'Role / Type' },
    { key: 'base_amount', label: 'Base Pay' },
    { key: 'cycle', label: 'Structure' },
    { key: 'payment_info', label: 'Payment Account' },
  ];

  const rowsProfiles = filteredProfiles.map((p: any) => {
    const configured = isProfileConfigured(p);
    const rowActions = configured
      ? [
          { key: 'view_details', label: 'View Profile & History', icon: 'mdi:account-details-outline' },
          { key: 'pay_now', label: 'Pay Now (Single Disbursal)', icon: 'mdi:cash-send' },
          { key: 'edit', label: 'Edit Salary Profile', icon: 'mdi:pencil-outline' },
          { key: 'delete', label: 'Remove from Payroll', icon: 'mdi:trash-can-outline', destructive: true },
        ]
      : [
          { key: 'edit', label: 'Complete Profile Setup', icon: 'mdi:pencil-outline' },
          { key: 'delete', label: 'Remove from Payroll', icon: 'mdi:trash-can-outline', destructive: true },
        ];

    return {
      id: p.id,
      staff: (
        <div className="flex flex-col cursor-pointer">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-foreground hover:text-primary transition-colors">{p.full_name || p.name}</span>
            {p.is_off_platform && <span className="inline-block text-[10px] font-bold px-1.5 py-0.5 rounded bg-purple-400/10 text-purple-600 dark:text-purple-400">External</span>}
            {!configured && <span className="inline-block text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-400/10 text-amber-600 dark:text-amber-400">Unconfigured</span>}
          </div>
        </div>
      ),
      role: <span className="capitalize text-xs font-medium text-foreground px-2 py-1.5 rounded bg-muted/60">{p.role_title || (p.is_off_platform ? 'Contractor' : 'Staff')}</span>,
      base_amount: configured ? <span className="font-bold text-foreground"><CurrencyDisplay amount={p.base_amount || 0} showStyling={false} /></span> : <span className="text-xs text-amber-600 dark:text-amber-400 font-semibold">—</span>,
      cycle: <span className="capitalize text-sm font-semibold text-muted-foreground">{configured ? p.compensation_type?.replace(/_/g, ' ') || 'Monthly Salary' : '—'}</span>,
      payment_info: configured ? (
        <div className="flex flex-col text-xs">
          {p.payment_method === 'cash' ? (
            <span className="font-semibold text-foreground">Cash</span>
          ) : (
            <>
              <span className="font-semibold text-foreground">{p.bank_or_momo_name || 'Bank/Momo'}</span>
              <span className="text-muted-foreground font-mono text-[11px]">{p.account_number || 'No set'}</span>
            </>
          )}
        </div>
      ) : <span className="text-xs text-muted-foreground italic">Tap row to configure</span>,
      rowActions,
      __record: p,
    };
  });

  const handleRowActionClickLog = (actionKey: string, row: any) => {
    if (actionKey === 'view_details') {
      if (row.__is_run) { setSelectedRun(row.__record); setIsRunDetailsOpen(true); }
      else { setSelectedDisbursal(row.__record); setIsPaySlipOpen(true); }
    }
  };

  const handleRowActionClickProfiles = (actionKey: string, row: any) => {
    const record = row.__record;
    if (actionKey === 'view_details') { setSelectedStaffProfile(record); setIsStaffDetailsOpen(true); }
    else if (actionKey === 'edit') { setEditingProfile(record); setIsProfileModalOpen(true); }
    else if (actionKey === 'pay_now') { navigate(`/staff/payroll/run?staff_id=${record.id}`, { state: { profiles: salaryProfiles } }); }
    else if (actionKey === 'delete') { setProfileToDelete(record); setIsRemoveModalOpen(true); }
  };

  const handleLogRowClick = (key: any) => {
    const foundRun = payrollRuns.find((r) => r.id === key);
    if (foundRun) { setSelectedRun(foundRun); setIsRunDetailsOpen(true); return; }
    const foundDisbursal = disbursalLog.find((d) => d.id === key);
    if (foundDisbursal) { setSelectedDisbursal(foundDisbursal); setIsPaySlipOpen(true); }
  };

  const handleProfileRowClick = (key: any) => {
    const found = salaryProfiles.find((p) => p.id === key);
    if (!found) return;
    if (!isProfileConfigured(found)) { setEditingProfile(found); setIsProfileModalOpen(true); }
    else { setSelectedStaffProfile(found); setIsStaffDetailsOpen(true); }
  };

  const monthTotalDisbursed = disbursalLog.filter((d) => d.status !== 'voided').reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0);
  const platformDisbursed = disbursalLog.filter((d) => !d.is_off_platform && d.status !== 'voided').reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0);
  const externalDisbursed = disbursalLog.filter((d) => d.is_off_platform && d.status !== 'voided').reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0);
  const totalMonthlyPayroll = salaryProfiles.reduce((acc, curr) => acc + (Number(curr.base_amount) || 0), 0);
  const platformPayroll = salaryProfiles.filter((p) => !p.is_off_platform).reduce((acc, curr) => acc + (Number(curr.base_amount) || 0), 0);
  const externalPayroll = salaryProfiles.filter((p) => p.is_off_platform).reduce((acc, curr) => acc + (Number(curr.base_amount) || 0), 0);
  const readyCount = salaryProfiles.filter(isProfileConfigured).length;
  const unconfiguredCount = salaryProfiles.length - readyCount;
  const platformCount = salaryProfiles.filter((p) => !p.is_off_platform).length;
  const externalCount = salaryProfiles.filter((p) => p.is_off_platform).length;
  const lastDisbursalDate = disbursalLog[0]?.date_paid || payrollRuns[0]?.disbursal_date;

  const profileFilterOptions = [
    { name: 'All Roster', uid: 'all' },
    { name: 'Platform Staff', uid: 'platform' },
    { name: 'External Staff', uid: 'external' },
  ];

  return (
    <PageLayout
      title="Payroll & Salaries"
      subtitle={
        isMobile ? (
          activeTab === 'log'
            ? `${combinedLogRows.length} disbursal run${combinedLogRows.length !== 1 ? 's' : ''} in period`
            : `${salaryProfiles.length} salary profile${salaryProfiles.length !== 1 ? 's' : ''} configured`
        ) : undefined
      }
      actions={
        <div className="hidden md:inline-flex items-center bg-muted/80 p-[3px] rounded-lg border border-border/60 text-[12px] font-medium">
          <button
            type="button"
            onClick={() => handleTabChange('log')}
            className={clsx(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-all cursor-pointer font-semibold',
              activeTab === 'log'
                ? 'bg-background text-foreground shadow-xs'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            Disbursal Log
          </button>
          <button
            type="button"
            onClick={() => handleTabChange('profiles')}
            className={clsx(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-all cursor-pointer font-semibold',
              activeTab === 'profiles'
                ? 'bg-background text-foreground shadow-xs'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            Salary Profiles ({salaryProfiles.length})
          </button>
        </div>
      }
      constrainHeight={true}
      subtitleStyles="!block -mt-3 mb-2 md:-mt-4 md:mb-2 text-[11px] md:text-sm"
    >
      <MobileDashboardWrapper className="block md:hidden">
        {activeTab === 'log' ? (
          <MobileHeroCard
            title="Total Disbursed"
            badge={dateFilter.active === 'this_month' ? 'This Month' : dateFilter.active?.replace(/_/g, ' ')}
            value={isLoading ? '...' : <CurrencyDisplay amount={monthTotalDisbursed} />}
            isLoading={isLoading}
          >
            <MobileMetricPill
              title="Platform Payouts"
              value={<CurrencyDisplay amount={platformDisbursed} />}
              subtitle="Staff Salaries"
              icon={<Users className="h-3.5 w-3.5" />}
              iconColorClass="bg-blue-500/10 text-blue-500"
              isLoading={isLoading}
            />
            <MobileMetricPill
              title="External Payouts"
              value={<CurrencyDisplay amount={externalDisbursed} />}
              subtitle="Contractor Wages"
              icon={<Banknote className="h-3.5 w-3.5" />}
              iconColorClass="bg-amber-500/10 text-amber-500"
              isLoading={isLoading}
            />
            <MobileMetricPill
              title="Profiles"
              value={salaryProfiles.length}
              subtitle="Roster Setup"
              icon={<Users className="h-3.5 w-3.5" />}
              iconColorClass="bg-purple-500/10 text-purple-500"
              isLoading={isLoading}
              onClick={() => handleTabChange('profiles')}
            />
          </MobileHeroCard>
        ) : (
          <MobileHeroCard
            title="Total Monthly Payroll"
            badge="Roster Obligation"
            value={isLoading ? '...' : <CurrencyDisplay amount={totalMonthlyPayroll} />}
            isLoading={isLoading}
          >
            <MobileMetricPill
              title="Platform Salaries"
              value={<CurrencyDisplay amount={platformPayroll} />}
              subtitle={`${platformCount} Staff`}
              icon={<Users className="h-3.5 w-3.5" />}
              iconColorClass="bg-blue-500/10 text-blue-500"
              isLoading={isLoading}
            />
            <MobileMetricPill
              title="External Wages"
              value={<CurrencyDisplay amount={externalPayroll} />}
              subtitle={`${externalCount} Staff`}
              icon={<Banknote className="h-3.5 w-3.5" />}
              iconColorClass="bg-amber-500/10 text-amber-500"
              isLoading={isLoading}
            />
            <MobileMetricPill
              title="Disbursals"
              value={<CurrencyDisplay amount={monthTotalDisbursed} />}
              subtitle="This Month"
              icon={<History className="h-3.5 w-3.5" />}
              iconColorClass="bg-emerald-500/10 text-emerald-500"
              isLoading={isLoading}
              onClick={() => handleTabChange('log')}
            />
          </MobileHeroCard>
        )}

        <MobileActionCapsuleBar
          dateFilterConfig={
            activeTab === 'log'
              ? {
                  value: dateFilter,
                  onChange: setDateFilter,
                }
              : undefined
          }
          searchConfig={{
            value: activeTab === 'log' ? searchLogQuery : searchProfilesQuery,
            onChange: activeTab === 'log' ? setSearchLogQuery : setSearchProfilesQuery,
            placeholder: activeTab === 'log' ? 'Search disbursals...' : 'Search staff roster...',
          }}
          actions={
            activeTab === 'log'
              ? [
                  {
                    label: 'Process Run',
                    icon: <Send className="h-3.5 w-3.5 text-primary" />,
                    onClick: () => {
                      setSingleRecipientId(undefined);
                      navigate('/staff/payroll/run', { state: { profiles: salaryProfiles } });
                    },
                  },
                  {
                    label: 'Refresh',
                    icon: <RefreshCw className="h-3.5 w-3.5 text-primary" />,
                    onClick: fetchPayrollData,
                  },
                ]
              : [
                  {
                    label: 'Import Staff',
                    icon: <UserPlus className="h-3.5 w-3.5 text-primary" />,
                    onClick: () => setIsImportStaffModalOpen(true),
                  },
                  {
                    label: 'External',
                    icon: <Plus className="h-3.5 w-3.5 text-primary" />,
                    onClick: () => setIsOffPlatformModalOpen(true),
                  },
                  {
                    label: 'Refresh',
                    icon: <RefreshCw className="h-3.5 w-3.5 text-primary" />,
                    onClick: fetchPayrollData,
                  },
                ]
          }
        />

        {activeTab === 'log' ? (
          <MobileActivitySheet
            title="Disbursal Log"
            viewAllLabel="Salary Profiles"
            onViewAll={() => handleTabChange('profiles')}
            tabs={[
              { id: 'all', label: 'All' },
              { id: 'logged', label: 'Logged' },
              { id: 'voided', label: 'Voided' },
            ]}
            activeTab={mobileLogTab}
            onTabChange={setMobileLogTab}
            totalCount={filteredMobileLog.length}
            currentCount={filteredMobileLog.length}
          >
            {isLoading ? (
              <div className="py-8 text-center"><Spinner /></div>
            ) : filteredMobileLog.length === 0 ? (
              <div className="py-10 text-center text-xs text-muted-foreground">No disbursals found for the selected filter or date range.</div>
            ) : (
              filteredMobileLog.map((row: any) => {
                const isVoided = row.status === 'voided';
                return (
                  <div key={row.id} onClick={() => handleLogRowClick(row.id)} className="py-3 flex flex-col gap-2 text-xs hover:bg-muted/20 px-1 rounded-lg transition-colors border-b border-border/20 last:border-0 cursor-pointer">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="font-bold text-foreground truncate max-w-[210px]">{row.is_run ? row.pay_period : row.recipient_name}</p>
                        <p className="text-[11px] text-muted-foreground mt-0.5">{row.is_run ? `${row.recipients_text} (${row.platform_count} Platform · ${row.external_count} External)` : row.is_off_platform ? 'External Staff' : 'Platform Staff'}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className={clsx('text-xs font-bold', isVoided ? 'line-through text-muted-foreground' : 'text-foreground')}><CurrencyDisplay amount={row.amount} showStyling={false} /></p>
                        <span className="text-[10px] text-muted-foreground capitalize">{row.payment_method?.replace(/_/g, ' ') || 'Cash'}</span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between gap-2 pt-1 border-t border-border/30">
                      <span className="text-[11px] text-muted-foreground font-medium">{row.disbursal_date ? format(new Date(row.disbursal_date), 'MMM dd, yyyy') : '—'}</span>
                      <div className="flex items-center gap-1.5">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold capitalize ${isVoided ? 'bg-rose-500/10 text-rose-600' : 'bg-emerald-500/10 text-emerald-600'}`}>
                          {isVoided ? 'Voided' : 'Logged'}
                        </span>
                        <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </MobileActivitySheet>
        ) : (
          <MobileActivitySheet
            title="Salary Profiles"
            viewAllLabel="Disbursal Log"
            onViewAll={() => handleTabChange('log')}
            secondary={true}
            tabs={[
              { id: 'all', label: 'All' },
              { id: 'platform', label: 'Platform' },
              { id: 'external', label: 'External' },
              { id: 'unconfigured', label: 'Unconfigured' },
            ]}
            activeTab={mobileProfilesTab}
            onTabChange={setMobileProfilesTab}
            totalCount={filteredMobileProfiles.length}
            currentCount={filteredMobileProfiles.length}
          >
            {isLoading ? (
              <div className="py-8 text-center"><Spinner /></div>
            ) : filteredMobileProfiles.length === 0 ? (
              <div className="py-10 text-center text-xs text-muted-foreground">No salary profiles found matching your search.</div>
            ) : (
              filteredMobileProfiles.map((p: any) => {
                const configured = isProfileConfigured(p);
                return (
                  <div key={p.id} onClick={() => handleProfileRowClick(p.id)} className="py-3 flex flex-col gap-2 text-xs hover:bg-muted/20 px-1 rounded-lg transition-colors border-b border-border/20 last:border-0 cursor-pointer">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <p className="font-bold text-foreground truncate max-w-[170px]">{p.full_name || p.name}</p>
                          {p.is_off_platform ? (
                            <span className="text-[9px] font-bold px-1.5 py-0.2 rounded-full bg-purple-500/10 text-purple-600 border border-purple-500/20">External</span>
                          ) : (
                            <span className="text-[9px] font-bold px-1.5 py-0.2 rounded-full bg-blue-500/10 text-blue-600 border border-blue-500/20">Platform</span>
                          )}
                        </div>
                        <p className="text-[11px] text-muted-foreground mt-0.5 capitalize">{p.role_title || (p.is_off_platform ? 'Contractor' : 'Staff')}</p>
                      </div>
                      <div className="text-right shrink-0">
                        {configured ? (
                          <>
                            <p className="text-xs font-bold text-foreground"><CurrencyDisplay amount={p.base_amount || 0} showStyling={false} /></p>
                            <span className="text-[10px] text-muted-foreground capitalize">{p.compensation_type?.replace(/_/g, ' ') || 'Monthly Salary'}</span>
                          </>
                        ) : (
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-600 border border-amber-500/20">Unconfigured</span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center justify-between gap-2 pt-1 border-t border-border/30">
                      <span className="text-[10px] text-muted-foreground truncate max-w-[200px]">
                        {configured ? (p.payment_method === 'cash' ? 'Cash Payout' : `${p.bank_or_momo_name || 'Account'}: ${p.account_number || ''}`) : 'Tap to configure profile'}
                      </span>
                      <div className="flex items-center gap-1.5">
                        {configured && (
                          <Button size="sm" onClick={(e) => { e.stopPropagation(); navigate(`/staff/payroll/run?staff_id=${p.id}`, { state: { profiles: salaryProfiles } }); }} className="h-6 px-2 text-[10px] font-semibold bg-primary text-primary-foreground hover:bg-primary/90 rounded-md">Pay Now</Button>
                        )}
                        <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </MobileActivitySheet>
        )}
      </MobileDashboardWrapper>

      <div className="hidden md:flex flex-col flex-1 min-h-0 relative h-full">
        <div className="mb-4 lg:mb-5 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
          {activeTab === 'log' ? (
            <>
              <DashboardCard title="Total Disbursed" value={isLoading ? '...' : <CurrencyDisplay amount={monthTotalDisbursed} />} />
              <DashboardCard title="Platform Staff Payouts" value={isLoading ? '...' : <CurrencyDisplay amount={platformDisbursed} />} />
              <DashboardCard title="External Staff Payouts" value={isLoading ? '...' : <CurrencyDisplay amount={externalDisbursed} />} />
              <DashboardCard title="Last Disbursal Date" value={isLoading ? '...' : lastDisbursalDate ? format(new Date(lastDisbursalDate), 'MMM dd, yyyy') : 'No runs yet'} valueStyle={!isLoading ? 'lg:text-lg xl:text-lg font-header tracking-tight' : ''} />
            </>
          ) : (
            <>
              <DashboardCard title="Total Monthly Payroll" value={isLoading ? '...' : <CurrencyDisplay amount={totalMonthlyPayroll} />} />
              <DashboardCard title="Platform Staff Salaries" value={isLoading ? '...' : <CurrencyDisplay amount={platformPayroll} />} />
              <DashboardCard title="External Staff Wages" value={isLoading ? '...' : <CurrencyDisplay amount={externalPayroll} />} />
              <DashboardCard title="Roster Status" value={isLoading ? '...' : unconfiguredCount > 0 ? `${readyCount} Ready · ${unconfiguredCount} Unconfigured` : `${readyCount} Ready`} valueStyle={!isLoading ? 'lg:text-lg xl:text-lg font-header tracking-tight' : ''} />
            </>
          )}
        </div>

        {activeTab === 'log' ? (
          <EnhancedTableComponent
            columns={columnsLog}
            rows={rowsLog}
            isLoading={isLoading}
            title=""
            showSearch={true}
            searchPlaceholder="Search disbursals by pay period or recipient..."
            showDateFilter={true}
            dateFilterValue={dateFilter}
            onDateFilterChange={(val) => setDateFilter(val)}
            defaultDateFilterRange="this_month"
            showAddButton={true}
            addButtonText="Process Payroll Run"
            addButtonIcon="ph:paper-plane-tilt-bold"
            onAddButtonClick={() => { setSingleRecipientId(undefined); navigate('/staff/payroll/run', { state: { profiles: salaryProfiles } }); }}
            onRefresh={fetchPayrollData}
            onRowActionClick={handleRowActionClickLog}
            onclick={handleLogRowClick}
            mobileFriendly={true}
          />
        ) : (
          <EnhancedTableComponent
            columns={columnsProfiles}
            rows={rowsProfiles}
            isLoading={isLoading}
            title=""
            showSearch={true}
            searchPlaceholder="Search staff roster by name or role..."
            showFilter={true}
            filterLabel={profileFilter === 'all' ? 'Roster: All' : profileFilter === 'platform' ? 'Roster: Platform' : 'Roster: External'}
            filterOptions={profileFilterOptions}
            filterValue={new Set([profileFilter])}
            topActions={[
              { title: 'Import Platform Staff', icon: 'solar:user-plus-linear', variant: 'flat', onPress: () => setIsImportStaffModalOpen(true), className: 'rounded' },
              { title: 'Add External Staff', icon: 'solar:user-plus-bold', variant: 'bordered', onPress: () => setIsOffPlatformModalOpen(true), className: 'border-1 rounded' },
            ]}
            showAddButton={false}
            onRefresh={fetchPayrollData}
            onRowActionClick={handleRowActionClickProfiles}
            onclick={handleProfileRowClick}
            mobileFriendly={true}
          />
        )}
      </div>

      {(isRunRoute || isProcessModalOpen) && (
        isMobileView ? (
          <MobilePayrollRunModal
            isOpen={true}
            onClose={() => {
              setIsProcessModalOpen(false);
              setSingleRecipientId(undefined);
              if (isRunRoute) navigate('/staff/payroll', { replace: true });
            }}
            profiles={salaryProfiles.filter(isProfileConfigured)}
            excludedCount={salaryProfiles.length - salaryProfiles.filter(isProfileConfigured).length}
            initialSelectedId={staffIdParam || singleRecipientId}
            onSuccess={() => {
              fetchPayrollData();
              setIsProcessModalOpen(false);
              setSingleRecipientId(undefined);
              if (isRunRoute) navigate('/staff/payroll', { replace: true });
            }}
            onCancel={() => {
              setIsProcessModalOpen(false);
              setSingleRecipientId(undefined);
              if (isRunRoute) navigate('/staff/payroll', { replace: true });
            }}
          />
        ) : (
          <ProcessPayrollModal
            isOpen={true}
            onClose={() => {
              setIsProcessModalOpen(false);
              setSingleRecipientId(undefined);
              if (isRunRoute) navigate('/staff/payroll', { replace: true });
            }}
            profiles={salaryProfiles.filter(isProfileConfigured)}
            excludedCount={salaryProfiles.length - salaryProfiles.filter(isProfileConfigured).length}
            initialSelectedId={staffIdParam || singleRecipientId}
            onSuccess={() => {
              fetchPayrollData();
              setIsProcessModalOpen(false);
              setSingleRecipientId(undefined);
              if (isRunRoute) navigate('/staff/payroll', { replace: true });
            }}
          />
        )
      )}

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
            <h2 className="text-xl font-bold">
              {editingProfile?.full_name || editingProfile?.name
                ? `Salary Profile — ${editingProfile.full_name || editingProfile.name}`
                : 'Configure Salary Profile'}
            </h2>
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

      {/* Drawer 1: Pay Slip View */}
      <PaySlipDrawer
        isOpen={isPaySlipOpen}
        onClose={() => {
          setIsPaySlipOpen(false);
          setSelectedDisbursal(null);
        }}
        disbursal={selectedDisbursal}
        onSuccess={fetchPayrollData}
      />

      {/* Drawer 2: Batch Payroll Run Details Drawer */}
      <PayrollRunDetailsDrawer
        isOpen={isRunDetailsOpen}
        onClose={() => {
          setIsRunDetailsOpen(false);
          setSelectedRun(null);
        }}
        run={selectedRun}
        onRefresh={fetchPayrollData}
      />

      {/* Drawer 3: Staff Payroll Details Drawer */}
      <StaffPayrollDetailsDrawer
        isOpen={isStaffDetailsOpen}
        onClose={() => {
          setIsStaffDetailsOpen(false);
          setSelectedStaffProfile(null);
        }}
        profile={selectedStaffProfile}
        disbursalHistory={disbursalLog}
        onEditProfile={(p) => {
          setEditingProfile(p);
          setIsProfileModalOpen(true);
        }}
        onSingleDisburse={(p) => {
          setSingleRecipientId(p.id);
          setIsProcessModalOpen(true);
        }}
        onDeleteProfile={(p) => {
          setProfileToDelete(p);
          setIsRemoveModalOpen(true);
        }}
      />

      {/* Modal 4: Import Platform Staff Modal */}
      <ImportStaffToPayrollModal
        isOpen={isImportStaffModalOpen}
        onClose={() => setIsImportStaffModalOpen(false)}
        staffList={staffMembers}
        existingProfiles={salaryProfiles}
        onSuccess={fetchPayrollData}
        isMobileView={isMobileView}
      />

      {/* Modal 5: Remove Salary Profile Modal */}
      <RemoveSalaryProfileModal
        isOpen={isRemoveModalOpen}
        onClose={() => {
          if (!isDeletingProfile) {
            setIsRemoveModalOpen(false);
            setProfileToDelete(null);
          }
        }}
        profile={profileToDelete}
        onConfirm={() => handleDeleteSalaryProfile(profileToDelete)}
        isDeleting={isDeletingProfile}
      />
    </PageLayout>
  );
}
