import React, { useState, useEffect } from 'react';
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

export default function StaffManagement() {
  const [staffList, setStaffList] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
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

  const fetchStaff = async () => {
    setIsLoading(true);
    try {
      const response = await apiClient.get('/tenant/staff?limit=50');
      setStaffList(response.data.success.data.staff || []);
    } catch (error) {
      console.error('Failed to fetch staff:', error);
      toast.error('Failed to load staff directory');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchStaff();
  }, []);

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

  return (
    <PageLayout title="Staff Management" constrainHeight={true}>
      <EnhancedTableComponent
        columns={columns}
        rows={rows}
        isLoading={isLoading}
        title="Team Directory"
        
        showSearch={false}
        showFilter={false}
        
        showAddButton={true}
        addButtonText="Add Staff"
        onAddButtonClick={openNewStaff}
        onRowActionClick={handleRowActionClick}
        
        mobileFriendly={true}
      />

      {/* Slide-over Form Modal */}
      <CustomModal
        isOpen={isFormModalOpen}
        onOpenChange={() => setIsFormModalOpen(!isFormModalOpen)}
        placement="right"
        size="lg"
        classNames={{ base: "sm:w-[500px]" }}
        header={
          <div className="pt-3 px-2 pb-2 border-b border-border/60">
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
