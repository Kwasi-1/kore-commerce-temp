import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import PageLayout from '@/components/layout/PageLayout';
import EnhancedTableComponent from '@/components/shared/MainTableComponent';
import CustomModal from '@/components/modals/modal';
import SupplierForm from '@/components/inventory/SupplierForm';
import SupplierStatusModal from '@/components/inventory/SupplierStatusModal';
import apiClient from '@/api/client';
import toast from 'react-hot-toast';

import { CurrencyDisplay } from '@/hooks';

export default function Suppliers() {
  const navigate = useNavigate();
  const location = useLocation();
  const staffUser = useAuthStore((state) => state.staffUser);
  const showCreditTab = staffUser?.role === 'owner' || staffUser?.role === 'manager';

  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [pagination, setPagination] = useState<any>(null);
  
  // Search
  const [searchQuery, setSearchQuery] = useState('');
  
  // Form Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<any>(null);

  // Status Modal state
  const [statusModalSupplier, setStatusModalSupplier] = useState<any>(null);
  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
  const [isStatusLoading, setIsStatusLoading] = useState(false);

  const fetchSuppliers = useCallback(async (pageNumber: number = 1) => {
    setIsLoading(true);
    try {
      let url = `/tenant/suppliers?page=${pageNumber}&limit=20`;
      if (searchQuery.trim()) url += `&search=${encodeURIComponent(searchQuery.trim())}`;

      const response = await apiClient.get(url);
      const suppliersList = response.data.data?.suppliers || response.data.success?.data?.suppliers || [];
      const pag = response.data.data?.pagination || response.data.success?.data?.pagination || null;
      setSuppliers(suppliersList);
      setPagination(pag);
    } catch (error) {
      console.error('Failed to fetch suppliers:', error);
      toast.error('Failed to load suppliers');
    } finally {
      setIsLoading(false);
    }
  }, [searchQuery]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchSuppliers(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [fetchSuppliers]);

  const handleFormSuccess = () => {
    setIsModalOpen(false);
    fetchSuppliers(pagination?.page || 1);
  };

  const handleEdit = (supplier: any) => {
    setEditingSupplier(supplier);
    setIsModalOpen(true);
  };

  const openNewSupplier = () => {
    setEditingSupplier(null);
    setIsModalOpen(true);
  };

  const handleConfirmStatus = async () => {
    if (!statusModalSupplier) return;
    setIsStatusLoading(true);
    try {
      await apiClient.put(`/tenant/suppliers/${statusModalSupplier.id}/status`, {});
      const nextActive = statusModalSupplier.is_active === false || statusModalSupplier.isActive === false;
      toast.success(`Supplier ${nextActive ? 'activated' : 'deactivated'}`);
      setIsStatusModalOpen(false);
      setStatusModalSupplier(null);
      fetchSuppliers();
    } catch (error: any) {
      console.error('Toggle supplier status error:', error);
      toast.error(error.response?.data?.error?.message || 'Failed to update supplier status');
    } finally {
      setIsStatusLoading(false);
    }
  };

  const columns = [
    { key: 'name', label: 'Supplier Name' },
    { key: 'contact_person', label: 'Contact Person' },
    { key: 'email', label: 'Email' },
    { key: 'phone', label: 'Phone' },
    { key: 'outstanding_debt', label: 'Outstanding Debt' },
    { key: 'status', label: 'Status' }
  ];

  const rows = suppliers.map((s: any) => {
    const debtAmount = s.total_debt ?? s.outstanding_balance ?? 0;
    const isActive = s.is_active !== undefined ? s.is_active : (s.isActive !== undefined ? s.isActive : true);
    return {
      id: s.id,
      name: <span className="font-semibold text-foreground">{s.name}</span>,
      contact_person: s.contact_person || '—',
      email: s.email ? <a href={`mailto:${s.email}`} className="text-blue-500 hover:underline">{s.email}</a> : '—',
      phone: s.phone || '—',
      outstanding_debt: (
        <span className={`font-bold text-xs ${debtAmount > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-muted-foreground'}`}>
          {debtAmount > 0 ? <CurrencyDisplay amount={debtAmount} showStyling={false} /> : '—'}
        </span>
      ),
      status: (
        <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${
          isActive ? 'text-green-600 bg-green-50 dark:bg-green-900/30 dark:text-green-400' 
          : 'text-red-600 bg-red-50 dark:bg-red-900/30 dark:text-red-400'
        }`}>
          {isActive ? 'Active' : 'Inactive'}
        </span>
      ),
      rowActions: [
        { key: 'edit', label: 'Edit', icon: 'mdi:pencil-outline' },
        { 
          key: 'toggle_status', 
          label: isActive ? 'Deactivate' : 'Activate', 
          icon: isActive ? 'mdi:account-off-outline' : 'mdi:account-check-outline'
        }
      ],
      __record: s
    };
  });

  const handleRowActionClick = (actionKey: string, row: any) => {
    if (actionKey === 'edit') handleEdit(row.__record);
    if (actionKey === 'toggle_status') {
      setStatusModalSupplier(row.__record);
      setIsStatusModalOpen(true);
    }
  };

  return (
    <PageLayout title="Suppliers" constrainHeight={true}>
      {/* Tab Switcher */}
      {showCreditTab && (
        <div className="flex border-b border-border mb-4">
          <button
            onClick={() => navigate('/inventory/suppliers')}
            className={`px-5 py-3 text-xs font-bold border-b-2 transition-all ${
              location.pathname === '/inventory/suppliers'
                ? "border-primary text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            Supplier Directory
          </button>
          <button
            onClick={() => navigate('/inventory/supplier-credit')}
            className={`px-5 py-3 text-xs font-bold border-b-2 transition-all ${
              location.pathname === '/inventory/supplier-credit'
                ? "border-primary text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            Credit Ledger
          </button>
        </div>
      )}

      <EnhancedTableComponent
        columns={columns}
        rows={rows}
        isLoading={isLoading}
        title="Supplier Directory"
        serverPagination={pagination}
        onPageChange={(page) => fetchSuppliers(page)}
        onRefresh={() => fetchSuppliers(1)}
        
        showSearch={true}
        searchPlaceholder="Search suppliers..."
        searchValue={searchQuery}
        onSearchChange={setSearchQuery}
        
        showFilter={false}
        
        showAddButton={true}
        addButtonText="New Supplier"
        onAddButtonClick={openNewSupplier}
        onRowActionClick={handleRowActionClick}
        
        mobileFriendly={true}
      />

      {/* Supplier Form Modal */}
      <CustomModal
        isOpen={isModalOpen}
        onOpenChange={() => setIsModalOpen(!isModalOpen)}
        placement="right"
        size="lg"
        classNames={{ base: "sm:w-[500px]" }}
        header={
          <div className="pt-3 px-2 pb-2 border-b border-border/80">
            <h2 className="text-xl font-bold">{editingSupplier ? 'Edit Supplier' : 'Add New Supplier'}</h2>
            <p className="text-sm text-muted-foreground font-normal">Manage supplier contact details.</p>
          </div>
        }
        body={
          <SupplierForm 
            initialData={editingSupplier} 
            onSuccess={handleFormSuccess}
            onCancel={() => setIsModalOpen(false)} 
          />
        }
      />

      {/* Activate / Deactivate Supplier Modal */}
      <SupplierStatusModal
        isOpen={isStatusModalOpen}
        onClose={() => {
          if (!isStatusLoading) {
            setIsStatusModalOpen(false);
            setStatusModalSupplier(null);
          }
        }}
        supplier={statusModalSupplier}
        onConfirm={handleConfirmStatus}
        isUpdating={isStatusLoading}
      />
    </PageLayout>
  );
}
