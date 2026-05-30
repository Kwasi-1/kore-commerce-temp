import React, { useState, useEffect } from 'react';
import PageLayout from '@/components/layout/PageLayout';
import EnhancedTableComponent from '@/components/shared/MainTableComponent';
import CustomModal from '@/components/modals/modal';
import StaffForm from '@/components/staff/StaffForm';
import NumPad from '@/components/pos/NumPad';
import apiClient from '@/api/client';
import toast from 'react-hot-toast';
import { KeyRound } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

export default function StaffManagement() {
  const [staffList, setStaffList] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Modals state
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState<any>(null);
  
  const [isPinModalOpen, setIsPinModalOpen] = useState(false);
  const [selectedCashier, setSelectedCashier] = useState<any>(null);

  const fetchStaff = async () => {
    setIsLoading(true);
    try {
      const response = await apiClient.get('/tenant/staff?limit=50');
      setStaffList(response.data.data.staff || []);
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

  const handleDelete = async (staffId: string) => {
    if (!window.confirm('Are you sure you want to deactivate this staff member? They will lose access to the system immediately.')) return;
    try {
      await apiClient.delete(`/tenant/staff/${staffId}`);
      toast.success('Staff member deactivated');
      fetchStaff();
    } catch (error: any) {
      console.error('Delete staff error:', error);
      toast.error(error.response?.data?.error?.message || 'Failed to deactivate staff');
    }
  };

  const handleSetPin = async (pin: string) => {
    if (!selectedCashier) return;
    
    try {
      await apiClient.post(`/tenant/staff/${selectedCashier.id}/set-pin`, { pin });
      toast.success('PIN set successfully');
      setIsPinModalOpen(false);
      setSelectedCashier(null);
    } catch (error: any) {
      console.error('Set PIN error:', error);
      toast.error(error.response?.data?.error?.message || 'Failed to set PIN');
    }
  };

  const openPinModal = (staff: any) => {
    setSelectedCashier(staff);
    setIsPinModalOpen(true);
  };

  const columns = [
    { key: 'name', label: 'Name' },
    { key: 'email', label: 'Email' },
    { key: 'role', label: 'Role' },
    { key: 'status', label: 'Status' },
    { key: 'last_login', label: 'Last Login' }
  ];

  const rows = staffList.map((s: any) => {
    const isCashier = s.role === 'cashier';
    const isOwner = s.role === 'owner';

    const rowActions = [
      { key: 'edit', label: 'Change Role', icon: 'mdi:shield-account-outline' },
    ];
    
    if (isCashier) {
      rowActions.push({ key: 'set_pin', label: 'Set POS PIN', icon: 'mdi:dialpad' });
    }
    
    if (!isOwner) { // Owners usually can't be deactivated easily via standard UI
      rowActions.push({ key: 'delete', label: 'Deactivate', icon: 'mdi:account-off-outline', className: 'text-danger' });
    }

    return {
      id: s.id,
      name: (
        <div className="flex flex-col">
          <span className="font-semibold text-gray-900 dark:text-gray-100">{s.first_name} {s.last_name}</span>
        </div>
      ),
      email: <span className="text-gray-500">{s.email}</span>,
      role: (
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold capitalize ${
          s.role === 'owner' ? 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400' 
          : s.role === 'manager' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400'
          : 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300'
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
    if (actionKey === 'edit') handleEdit(row.__record);
    if (actionKey === 'set_pin') openPinModal(row.__record);
    if (actionKey === 'delete') handleDelete(row.id);
  };

  return (
    <PageLayout title="Staff Management">
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
          <div className="pt-4 px-2">
            <h2 className="text-xl font-bold">{editingStaff ? 'Edit Staff Role' : 'Add New Staff'}</h2>
            <p className="text-sm text-gray-500 font-normal">Manage team access and permissions.</p>
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

      {/* Set PIN Modal (Centered) */}
      <CustomModal
        isOpen={isPinModalOpen}
        onOpenChange={() => setIsPinModalOpen(!isPinModalOpen)}
        placement="center"
        size="md"
        classNames={{ base: "max-w-[400px]" }}
        header={
          <div className="flex items-center gap-2 pt-2">
            <div className="p-2 bg-pos-accent/10 rounded-lg text-pos-accent">
              <KeyRound className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold">Set POS PIN</h2>
              <p className="text-sm text-gray-500 font-normal">For {selectedCashier?.first_name} {selectedCashier?.last_name}</p>
            </div>
          </div>
        }
        body={
          <div className="p-6 pt-0">
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-6 text-center">
              Enter a secure 4-digit PIN. Cashiers use this to quickly unlock the register.
            </p>
            <NumPad 
              onComplete={handleSetPin} 
              maxLength={4}
              mask={true} 
            />
          </div>
        }
      />

    </PageLayout>
  );
}
