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
import { 
  UserPlus, 
  RefreshCw, 
  Shield, 
  KeyRound, 
  Lock, 
  Pencil, 
  UserX, 
  UserCheck, 
  MoreVertical,
  Mail,
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

  const openNewStaff = () => {
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
      if (mobileTab === 'owner') return s.role === 'owner';
      return true;
    });
  }, [staffList, mobileTab]);

  const columns = [
    { key: 'name', label: 'Name' },
    { key: 'email', label: 'Email' },
    { key: 'role', label: 'Role' },
    { key: 'status', label: 'Status' },
    { key: 'last_login', label: 'Last Login' }
  ];

  const rows = staffList.map((s: any) => {
    const isOwner = s.role === 'owner';
    const isActive = s.is_active !== false;

    const rowActions = [
      { key: 'edit_staff', label: 'Edit Staff', icon: 'mdi:pencil-outline' },
      { key: 'change_role', label: 'Change Role', icon: 'mdi:shield-account-outline' },
      { key: 'reset_pin', label: 'Reset POS PIN', icon: 'mdi:dialpad' },
      { key: 'reset_password', label: 'Reset Password', icon: 'mdi:lock-reset' },
    ];
    
    if (!isOwner) {
      rowActions.push({
        key: 'toggle_status',
        label: isActive ? 'Deactivate' : 'Activate',
        icon: isActive ? 'mdi:account-off-outline' : 'mdi:account-check-outline'
      });
    }

    return {
      id: s.id,
      name: (
        <div className="flex flex-col">
          <span className="font-semibold text-foreground">{s.first_name} {s.last_name}</span>
        </div>
      ),
      email: <span className="text-muted-foreground">{s.email}</span>,
      role: (
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold capitalize ${
          s.role === 'owner' ? 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400' 
          : s.role === 'manager' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400'
          : 'bg-gray-100 text-gray-800 dark:bg-gray-800 '
        }`}>
          {s.role}
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

  const handleRowActionClick = (actionKey: string, row: any) => {
    if (actionKey === 'edit_staff') handleEdit(row.__record);
    if (actionKey === 'change_role') {
      setRoleModalStaff(row.__record);
      setIsRoleModalOpen(true);
    }
    if (actionKey === 'reset_pin') {
      setPinModalStaff(row.__record);
      setIsPinModalOpen(true);
    }
    if (actionKey === 'reset_password') {
      setPasswordModalStaff(row.__record);
      setIsPasswordModalOpen(true);
    }
    if (actionKey === 'toggle_status') {
      setStatusModalStaff(row.__record);
      setIsStatusModalOpen(true);
    }
  };

  const getRoleBadgeClasses = (role: string) => {
    switch (role?.toLowerCase()) {
      case 'owner':
        return 'bg-purple-500/10 text-purple-700 dark:text-purple-400 border-purple-500/20';
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
        isMobile ? (
          `${staffList.length} staff member${staffList.length !== 1 ? 's' : ''} listed`
        ) : undefined
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
              icon: <UserPlus className="h-3.5 w-3.5 text-primary" />,
              onClick: openNewStaff,
            },
            {
              label: 'Refresh',
              icon: <RefreshCw className="h-3.5 w-3.5 text-primary -mx-1" />,
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
              const isOwner = staff.role === 'owner';
              const isActive = staff.is_active !== false;
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
                        <span className={`inline-flex items-center px-1.5 py-0.2 rounded-full text-[9px] font-bold border capitalize ${getRoleBadgeClasses(staff.role)}`}>
                          {staff.role}
                        </span>
                      </div>

                      <p className="text-[11px] text-muted-foreground truncate max-w-[180px] mt-0.5">
                        {staff.email}
                      </p>

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
                      <DropdownMenuContent align="end" className="w-48 rounded-xl shadow-lg border-border/60">
                        <DropdownMenuItem
                          onClick={() => handleEdit(staff)}
                          className="gap-2 text-xs font-medium cursor-pointer"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                          <span>Edit Details</span>
                        </DropdownMenuItem>

                        <DropdownMenuItem
                          onClick={() => {
                            setRoleModalStaff(staff);
                            setIsRoleModalOpen(true);
                          }}
                          className="gap-2 text-xs font-medium cursor-pointer"
                        >
                          <Shield className="h-3.5 w-3.5" />
                          <span>Change Role</span>
                        </DropdownMenuItem>

                        <DropdownMenuItem
                          onClick={() => {
                            setPinModalStaff(staff);
                            setIsPinModalOpen(true);
                          }}
                          className="gap-2 text-xs font-medium cursor-pointer"
                        >
                          <KeyRound className="h-3.5 w-3.5" />
                          <span>Reset POS PIN</span>
                        </DropdownMenuItem>

                        <DropdownMenuItem
                          onClick={() => {
                            setPasswordModalStaff(staff);
                            setIsPasswordModalOpen(true);
                          }}
                          className="gap-2 text-xs font-medium cursor-pointer"
                        >
                          <Lock className="h-3.5 w-3.5" />
                          <span>Reset Password</span>
                        </DropdownMenuItem>

                        {!isOwner && (
                          <>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => {
                                setStatusModalStaff(staff);
                                setIsStatusModalOpen(true);
                              }}
                              className={`gap-2 text-xs font-medium cursor-pointer ${
                                isActive ? 'text-destructive focus:text-destructive' : 'text-emerald-600 focus:text-emerald-600'
                              }`}
                            >
                              {isActive ? (
                                <>
                                  <UserX className="h-3.5 w-3.5" />
                                  <span>Deactivate Staff</span>
                                </>
                              ) : (
                                <>
                                  <UserCheck className="h-3.5 w-3.5" />
                                  <span>Activate Staff</span>
                                </>
                              )}
                            </DropdownMenuItem>
                          </>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
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

    </PageLayout>
  );
}
