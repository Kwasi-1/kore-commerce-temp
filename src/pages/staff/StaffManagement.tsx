import React, { useState, useEffect, useCallback, useMemo } from 'react';
import PageLayout from '@/components/layout/PageLayout';
import EnhancedTableComponent from '@/components/shared/MainTableComponent';
import CustomModal from '@/components/modals/modal';
import StaffForm from '@/components/staff/StaffForm';
import StaffStatusModal from '@/components/staff/StaffStatusModal';
import ChangeStaffRoleModal from '@/components/staff/ChangeStaffRoleModal';
import ResetStaffPinModal from '@/components/staff/ResetStaffPinModal';
import ResetStaffPasswordModal from '@/components/staff/ResetStaffPasswordModal';
import apiClient from '@/api/client';
import toast from 'react-hot-toast';
import { formatDistanceToNow } from 'date-fns';
import { useIsMobile } from '@/hooks/useScreenSize';
import { useAuthStore } from '@/store/authStore';
import { ROLE_LABELS } from '@/utils/roles';
import { Icon } from '@iconify/react';
import {
  UserPlus,
  RefreshCw,
  MoreVertical,
  Clock
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import {
  MobileDashboardWrapper,
  MobileActionCapsuleBar,
  MobileActivitySheet,
} from '@/components/mobile-dashboard';

export default function StaffManagement() {
  const isMobile = useIsMobile();
  const [staffList, setStaffList] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [pagination, setPagination] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [mobileTab, setMobileTab] = useState('all');
  const currentStaffId = useAuthStore((s) => s.staffUser?.id);
  const currentRole = useAuthStore((s) => s.staffUser?.role);
  // Plan seat usage from the API: { limit, used, manager_limit, managers_used, extra }
  const [seats, setSeats] = useState<any>(null);
  // Roles the current user may add and manage (from the API). Never includes 'owner'.
  const [canManageRoles, setCanManageRoles] = useState<string[]>([]);

  // "Make owner" confirmation
  const [ownerTarget, setOwnerTarget] = useState<any>(null);
  const [ownerPassword, setOwnerPassword] = useState('');
  const [isTransferring, setIsTransferring] = useState(false);

  // Slide-over Edit/Create Staff Modal
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState<any>(null);

  // Quick Change Role Modal
  const [roleModalStaff, setRoleModalStaff] = useState<any>(null);
  const [isRoleModalOpen, setIsRoleModalOpen] = useState(false);

  // Reset POS PIN Modal
  const [pinModalStaff, setPinModalStaff] = useState<any>(null);
  const [isPinModalOpen, setIsPinModalOpen] = useState(false);

  // Reset Password Modal
  const [passwordModalStaff, setPasswordModalStaff] = useState<any>(null);
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);

  // Activate / Deactivate Modal
  const [statusModalStaff, setStatusModalStaff] = useState<any>(null);
  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
  const [isStatusLoading, setIsStatusLoading] = useState(false);

  const fetchStaff = useCallback(async (pageNumber: number = 1, append: boolean = false) => {
    if (append) {
      setIsLoadingMore(true);
    } else {
      setIsLoading(true);
    }
    try {
      let url = `/tenant/staff?page=${pageNumber}&per_page=20`;
      if (searchQuery.trim()) {
        url += `&search=${encodeURIComponent(searchQuery.trim())}`;
      }
      const response = await apiClient.get(url);
      const data = response.data.success?.data?.staff || [];
      const pag = response.data.success?.data?.pagination || null;
      setSeats(response.data.success?.data?.seats || null);
      setCanManageRoles(response.data.success?.data?.can_manage_roles || []);

      if (append) {
        setStaffList((prev) => [...prev, ...data]);
      } else {
        setStaffList(data);
      }
      setPagination(pag);
    } catch (error) {
      console.error('Failed to fetch staff:', error);
      toast.error('Failed to load staff directory');
    } finally {
      setIsLoading(false);
      setIsLoadingMore(false);
    }
  }, [searchQuery]);

  const handleLoadMore = () => {
    if (isLoading || isLoadingMore || !pagination?.hasNext) return;
    const nextPage = (pagination?.page || 1) + 1;
    fetchStaff(nextPage, true);
  };

  useEffect(() => {
    const timer = setTimeout(() => fetchStaff(1), 300);
    return () => clearTimeout(timer);
  }, [fetchStaff]);

  const handleFormSuccess = () => {
    setIsFormModalOpen(false);
    fetchStaff();
  };

  const handleEdit = (staff: any) => {
    setEditingStaff(staff);
    setIsFormModalOpen(true);
  };

  const seatsFull = seats?.limit != null && seats.used >= seats.limit;
  const seatSummary = seats
    ? [
        seats.limit != null ? `${seats.used} of ${seats.limit} staff accounts used` : `${seats.used} active staff`,
        seats.manager_limit != null && seats.manager_limit > 0 ? `${seats.managers_used} of ${seats.manager_limit} managers/admins` : null,
      ].filter(Boolean).join(' · ')
    : null;

  const openNewStaff = () => {
    if (seatsFull) {
      toast.error(`All ${seats.limit} staff accounts on your plan are in use. Deactivate someone, or add a seat pack.`);
      return;
    }
    setEditingStaff(null);
    setIsFormModalOpen(true);
  };

  const handleConfirmStatus = async () => {
    if (!statusModalStaff) return;
    setIsStatusLoading(true);
    try {
      await apiClient.put(`/tenant/staff/${statusModalStaff.id}/status`, {});
      const nextActive = statusModalStaff.is_active === false;
      toast.success(`Staff member ${nextActive ? 'activated' : 'deactivated'}`);
      setIsStatusModalOpen(false);
      setStatusModalStaff(null);
      fetchStaff();
    } catch (error: any) {
      console.error('Toggle staff status error:', error);
      toast.error(error.response?.data?.error?.message || 'Failed to update staff status');
    } finally {
      setIsStatusLoading(false);
    }
  };

  const filteredMobileStaff = useMemo(() => {
    return staffList.filter((s: any) => {
      if (mobileTab === 'active') return s.is_active !== false;
      if (mobileTab === 'deactivated') return s.is_active === false;
      if (mobileTab === 'cashier') return s.role === 'cashier';
      if (mobileTab === 'manager') return s.role === 'manager';
      if (mobileTab === 'admin') return s.role === 'admin';
      if (mobileTab === 'owner') return s.role === 'owner';
      return true;
    });
  }, [staffList, mobileTab]);

  // Staff still on a password an owner/manager set (e.g. Welcome@123)
  const tempPasswordBadge = (s: any) => {
    if (!s.must_change_password) return null;
    const expired = s.temp_password_expires_at && new Date(s.temp_password_expires_at) < new Date();
    return (
      <span
        title={expired ? 'Temporary password expired. Reset it so they can log in.' : 'Will set their own password at next login. The temporary one stops working 72 hours after it was set.'}
        className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${
          expired ? 'bg-destructive/10 text-destructive' : 'bg-amber-500/10 text-amber-600'
        }`}
      >
        {expired ? 'Temp password expired' : 'Temp password'}
      </span>
    );
  };

  const columns = [
    { key: 'name', label: 'Name' },
    { key: 'email', label: 'Email' },
    { key: 'role', label: 'Role' },
    { key: 'status', label: 'Status' },
    { key: 'last_login', label: 'Last Login' }
  ];

  // What the current user may do to this person. Mirrors the backend rules: the owner manages
  // everyone, admins manage managers and cashiers (other admins only if the owner allows it),
  // managers manage cashiers. Nobody changes their own role or status.
  type StaffAction = { key: string; label: string; icon: string; className?: string };
  const actionsFor = (s: any): StaffAction[] => {
    const isSelf = s.id === currentStaffId;
    const isActive = s.is_active !== false;
    const canManage = !isSelf && s.role !== 'owner' && canManageRoles.includes(s.role);
    const actions: StaffAction[] = [];
    if (isSelf || canManage) {
      actions.push({ key: 'edit_staff', label: 'Edit Staff', icon: 'mdi:pencil-outline' });
    }
    if (canManage && canManageRoles.length > 1) {
      actions.push({ key: 'change_role', label: 'Change Role', icon: 'mdi:shield-account-outline' });
    }
    if (isSelf || canManage) {
      actions.push({ key: 'reset_pin', label: 'Reset POS PIN', icon: 'mdi:dialpad' });
      actions.push({ key: 'reset_password', label: 'Reset Password', icon: 'mdi:lock-reset' });
    }
    if (currentRole === 'owner' && s.role === 'admin') {
      const allowed = !!s.permissions?.['staff.manage_admins'];
      actions.push({
        key: 'toggle_manage_admins',
        label: allowed ? 'Stop Managing Admins' : 'Allow Managing Admins',
        icon: 'mdi:account-supervisor-outline',
      });
    }
    if (currentRole === 'owner' && !isSelf && isActive) {
      actions.push({ key: 'make_owner', label: 'Make Owner', icon: 'mdi:crown-outline' });
    }
    if (canManage) {
      actions.push({
        key: 'toggle_status',
        label: isActive ? 'Deactivate' : 'Activate',
        icon: isActive ? 'mdi:account-off-outline' : 'mdi:account-check-outline',
        className: isActive ? 'text-destructive' : 'text-emerald-600',
      });
    }
    return actions;
  };

  const rows = staffList.map((s: any) => {
    const rowActions = actionsFor(s);

    return {
      id: s.id,
      name: (
        <div className="flex items-center gap-2">
          <span className="font-semibold text-foreground">{s.first_name} {s.last_name}</span>
          {tempPasswordBadge(s)}
        </div>
      ),
      email: <span className="text-muted-foreground">{s.email}</span>,
      role: (
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${getRoleBadgeClasses(s.role)}`}>
          {ROLE_LABELS[s.role] || s.role}
          {s.role === 'admin' && s.permissions?.['staff.manage_admins'] ? ' · manages admins' : ''}
        </span>
      ),
      status: (
        <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${
          s.is_active ? 'text-green-600 bg-green-50 dark:bg-green-900/30 dark:text-green-400'
          : 'text-red-600 bg-red-50 dark:bg-red-900/30 dark:text-red-400'
        }`}>
          {s.is_active ? 'Active' : 'Deactivated'}
        </span>
      ),
      last_login: s.last_login ? formatDistanceToNow(new Date(s.last_login), { addSuffix: true }) : 'Never',
      rowActions,
      __record: s
    };
  });

  const toggleManageAdmins = async (staff: any) => {
    const allow = !staff.permissions?.['staff.manage_admins'];
    try {
      await apiClient.put(`/tenant/staff/${staff.id}/permissions`, { manage_admins: allow });
      toast.success(allow ? `${staff.first_name} can now manage other admins` : `${staff.first_name} can no longer manage other admins`);
      fetchStaff();
    } catch (error: any) {
      toast.error(error.response?.data?.error?.message || 'Failed to update permissions');
    }
  };

  const confirmMakeOwner = async () => {
    if (!ownerTarget || !ownerPassword) return;
    setIsTransferring(true);
    try {
      const res = await apiClient.post(`/tenant/staff/${ownerTarget.id}/make-owner`, { password: ownerPassword });
      toast.success(res.data.success?.message || 'Ownership transferred');
      // The server already treats us as an admin; update the local copy so owner-only UI hides
      useAuthStore.setState((st) => ({ staffUser: st.staffUser ? { ...st.staffUser, role: 'admin' } : st.staffUser }));
      setOwnerTarget(null);
      setOwnerPassword('');
      fetchStaff();
    } catch (error: any) {
      toast.error(error.response?.data?.error?.message || 'Failed to transfer ownership');
    } finally {
      setIsTransferring(false);
    }
  };

  const handleAction = (actionKey: string, staff: any) => {
    if (actionKey === 'edit_staff') handleEdit(staff);
    if (actionKey === 'change_role') {
      setRoleModalStaff(staff);
      setIsRoleModalOpen(true);
    }
    if (actionKey === 'reset_pin') {
      setPinModalStaff(staff);
      setIsPinModalOpen(true);
    }
    if (actionKey === 'reset_password') {
      setPasswordModalStaff(staff);
      setIsPasswordModalOpen(true);
    }
    if (actionKey === 'toggle_status') {
      setStatusModalStaff(staff);
      setIsStatusModalOpen(true);
    }
    if (actionKey === 'toggle_manage_admins') toggleManageAdmins(staff);
    if (actionKey === 'make_owner') {
      setOwnerTarget(staff);
      setOwnerPassword('');
    }
  };

  const handleRowActionClick = (actionKey: string, row: any) => handleAction(actionKey, row.__record);

  const getRoleBadgeClasses = (role: string) => {
    switch (role?.toLowerCase()) {
      case 'owner':
        return 'bg-purple-500/10 text-purple-700 dark:text-purple-400 border-purple-500/20';
      case 'admin':
        return 'bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 border-indigo-500/20';
      case 'manager':
        return 'bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20';
      default:
        return 'bg-muted text-muted-foreground border-border/50';
    }
  };

  const getAvatarBg = (role: string) => {
    switch (role?.toLowerCase()) {
      case 'owner':
        return 'bg-purple-600 text-white';
      case 'admin':
        return 'bg-indigo-600 text-white';
      case 'manager':
        return 'bg-blue-600 text-white';
      default:
        return 'bg-emerald-600 text-white';
    }
  };

  return (
    <PageLayout
      title="Staff Management"
      subtitle={
        seatSummary || (isMobile ? `${staffList.length} staff member${staffList.length !== 1 ? 's' : ''} listed` : undefined)
      }
      headerVariant="action-bridge"
      constrainHeight={true}
      subtitleStyles="!block -mt-3 mb-2 md:-mt-4 md:mb-2 text-[11px] md:text-sm"
    >
      {/* ========================================================================= */}
      {/* MOBILE STAFF MANAGEMENT VIEW (Hidden >= md, Block < md)                   */}
      {/* ========================================================================= */}
      <MobileDashboardWrapper className="block md:hidden">
        {/* Action Capsule Bar (Search + Add Staff + Refresh) */}
        <MobileActionCapsuleBar
          searchConfig={{
            value: searchQuery,
            onChange: setSearchQuery,
            placeholder: "Search staff by name, email, role...",
          }}
          actions={[
            {
              label: 'Add Staff',
              icon: <UserPlus className="h-3.5 w-3.5" />,
              onClick: openNewStaff,
            },
            {
              label: 'Refresh',
              icon: <RefreshCw className="h-3.5 w-3.5 -mx-1" />,
              onClick: () => fetchStaff(1),
            },
          ]}
        />

        {/* Team Directory Activity Sheet */}
        <MobileActivitySheet
          title="Team Directory"
          secondary={true}
          tabs={[
            { id: 'all', label: 'All' },
            { id: 'active', label: 'Active' },
            { id: 'admin', label: 'Admins' },
            { id: 'cashier', label: 'Cashiers' },
            { id: 'manager', label: 'Managers' },
            { id: 'deactivated', label: 'Deactivated' },
          ]}
          activeTab={mobileTab}
          onTabChange={setMobileTab}
          hasMore={pagination?.hasNext}
          isLoadingMore={isLoadingMore}
          onLoadMore={handleLoadMore}
          totalCount={pagination?.total}
          currentCount={staffList.length}
        >
          {isLoading ? (
            <div className="py-8 text-center"><Spinner /></div>
          ) : filteredMobileStaff.length === 0 ? (
            <div className="py-10 text-center text-xs text-muted-foreground">
              No staff members found matching your filter or search.
            </div>
          ) : (
            filteredMobileStaff.map((staff) => {
              const isActive = staff.is_active !== false;
              const staffActions = actionsFor(staff);
              const fullName = `${staff.first_name || ''} ${staff.last_name || ''}`.trim() || staff.name || 'Staff Member';
              const initials = fullName
                .split(' ')
                .map((n: string) => n[0])
                .join('')
                .slice(0, 2)
                .toUpperCase() || 'ST';

              const lastActiveStr = staff.last_login
                ? formatDistanceToNow(new Date(staff.last_login), { addSuffix: true })
                : 'Never';

              return (
                <div
                  key={staff.id}
                  className="py-3 flex items-center justify-between text-xs hover:bg-muted/20 px-1 rounded-lg transition-colors gap-3 border-b border-border/20 last:border-0"
                >
                  {/* Left: Avatar + Staff Info */}
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className={`h-10 w-10 rounded-full shrink-0 flex items-center justify-center font-bold text-xs shadow-xs ${getAvatarBg(staff.role)}`}>
                      {initials}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-bold text-foreground truncate max-w-[150px]">
                          {fullName}
                        </p>
                        <span className={`inline-flex items-center px-1.5 py-0.2 rounded-full text-[9px] font-bold border ${getRoleBadgeClasses(staff.role)}`}>
                          {ROLE_LABELS[staff.role] || staff.role}
                        </span>
                      </div>

                      <p className="text-[11px] text-muted-foreground truncate max-w-[180px] mt-0.5">
                        {staff.email}
                      </p>
                      {staff.must_change_password && <div className="mt-0.5">{tempPasswordBadge(staff)}</div>}

                      <div className="flex items-center gap-1 text-[10px] text-muted-foreground/80 mt-0.5">
                        <Clock className="h-2.5 w-2.5" />
                        <span>{lastActiveStr}</span>
                      </div>
                    </div>
                  </div>

                  {/* Right: Status & Actions Menu */}
                  <div className="flex items-center gap-2 shrink-0">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      isActive
                        ? 'text-emerald-600 bg-emerald-500/10'
                        : 'text-destructive bg-destructive/10'
                    }`}>
                      {isActive ? 'Active' : 'Inactive'}
                    </span>

                    {staffActions.length > 0 && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-foreground rounded-full"
                          >
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-52 rounded-xl shadow-lg border-border/60">
                          {staffActions.map((action) => (
                            <React.Fragment key={action.key}>
                              {action.key === 'toggle_status' && <DropdownMenuSeparator />}
                              <DropdownMenuItem
                                onClick={() => handleAction(action.key, staff)}
                                className={`gap-2 text-xs font-medium cursor-pointer ${action.className || ''}`}
                              >
                                <Icon icon={action.icon} className="h-3.5 w-3.5" />
                                <span>{action.label}</span>
                              </DropdownMenuItem>
                            </React.Fragment>
                          ))}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </MobileActivitySheet>
      </MobileDashboardWrapper>

      {/* ========================================================================= */}
      {/* DESKTOP STAFF MANAGEMENT VIEW (Hidden < md, Flex >= md)                   */}
      {/* ========================================================================= */}
      <div className="hidden md:flex flex-col flex-1 min-h-0 relative h-full">
        <EnhancedTableComponent
          columns={columns}
          rows={rows}
          isLoading={isLoading}
          title="Team Directory"
          serverPagination={pagination}
          onPageChange={(page) => fetchStaff(page)}

          showSearch={true}
          searchPlaceholder="Search staff by name, email, phone, or role..."
          searchValue={searchQuery}
          onSearchChange={setSearchQuery}
          showFilter={false}

          showAddButton={true}
          addButtonText="Add Staff"
          onAddButtonClick={openNewStaff}
          onRefresh={() => fetchStaff(1)}
          onRowActionClick={handleRowActionClick}

          mobileFriendly={true}
        />
      </div>

      {/* Slide-over Form Modal */}
      <CustomModal
        isOpen={isFormModalOpen}
        onOpenChange={() => setIsFormModalOpen(!isFormModalOpen)}
        placement="right"
        size="lg"
        classNames={{ base: "sm:w-[500px]" }}
        header={
          <div className="pt-3 px-2 pb-2 border-b border-border/80">
            <h2 className="text-xl font-bold">{editingStaff ? 'Edit Staff Details' : 'Add New Staff'}</h2>
            <p className="text-sm text-muted-foreground font-normal">Manage team access and permissions.</p>
          </div>
        }
        body={
          <StaffForm
            initialData={editingStaff}
            roleOptions={canManageRoles}
            onSuccess={handleFormSuccess}
            onCancel={() => setIsFormModalOpen(false)}
          />
        }
      />

      {/* Quick Change Role Modal */}
      <ChangeStaffRoleModal
        isOpen={isRoleModalOpen}
        onClose={() => {
          setIsRoleModalOpen(false);
          setRoleModalStaff(null);
        }}
        staff={roleModalStaff}
        roleOptions={canManageRoles}
        onSuccess={fetchStaff}
      />

      {/* Reset POS PIN Modal */}
      <ResetStaffPinModal
        isOpen={isPinModalOpen}
        onClose={() => {
          setIsPinModalOpen(false);
          setPinModalStaff(null);
        }}
        staff={pinModalStaff}
        onSuccess={fetchStaff}
      />

      {/* Reset Password Modal */}
      <ResetStaffPasswordModal
        isOpen={isPasswordModalOpen}
        onClose={() => {
          setIsPasswordModalOpen(false);
          setPasswordModalStaff(null);
        }}
        staff={passwordModalStaff}
        onSuccess={fetchStaff}
      />

      {/* Activate / Deactivate Staff Modal */}
      <StaffStatusModal
        isOpen={isStatusModalOpen}
        onClose={() => {
          if (!isStatusLoading) {
            setIsStatusModalOpen(false);
            setStatusModalStaff(null);
          }
        }}
        staff={statusModalStaff}
        onConfirm={handleConfirmStatus}
        isLoading={isStatusLoading}
      />

      {/* Make Owner: hand over ownership (current owner becomes an admin) */}
      <CustomModal
        isOpen={!!ownerTarget}
        onOpenChange={() => !isTransferring && setOwnerTarget(null)}
        size="md"
        header={
          <div className="pt-2 px-1 border-b border-border/50 pb-2.5">
            <h2 className="text-lg font-bold text-foreground">Make {ownerTarget?.first_name} the owner?</h2>
            <p className="text-[12px] text-muted-foreground mt-0.5">{ownerTarget?.email}</p>
          </div>
        }
        body={
          <form
            id="make-owner-form"
            onSubmit={(e) => {
              e.preventDefault();
              confirmMakeOwner();
            }}
            className="py-2 space-y-3"
          >
            <ul className="text-sm text-muted-foreground space-y-1 list-disc pl-5">
              <li>They take over billing, payouts and managing admins.</li>
              <li>You become an admin. Only the new owner can give ownership back.</li>
            </ul>
            <label className="block">
              <span className="block text-xs text-muted-foreground mb-1">Enter your password to confirm</span>
              <input
                type="password"
                autoComplete="current-password"
                value={ownerPassword}
                onChange={(e) => setOwnerPassword(e.target.value)}
                className="w-full h-10 px-3 text-sm border border-border rounded-md bg-background focus:outline-none focus:border-foreground/40"
              />
            </label>
          </form>
        }
        footer={
          <div className="flex items-center justify-end gap-2 w-full pt-1 pb-1">
            <Button variant="outline" type="button" onClick={() => setOwnerTarget(null)} disabled={isTransferring} className="font-medium w-full">
              Cancel
            </Button>
            <Button
              type="submit"
              form="make-owner-form"
              disabled={isTransferring || !ownerPassword}
              className="bg-primary text-primary-foreground font-semibold w-full hover:bg-primary/90"
            >
              {isTransferring ? 'Transferring…' : 'Make owner'}
            </Button>
          </div>
        }
      />

    </PageLayout>
  );
}
