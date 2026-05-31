import React, { useState, useEffect } from 'react';
import PageLayout from '@/components/layout/PageLayout';
import EnhancedTableComponent from '@/components/shared/MainTableComponent';
import CustomModal from '@/components/modals/modal';
import SupplierForm from '@/components/inventory/SupplierForm';
import apiClient from '@/api/client';
import toast from 'react-hot-toast';

export default function Suppliers() {
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Search
  const [searchQuery, setSearchQuery] = useState('');
  
  // Form Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<any>(null);

  const fetchSuppliers = async () => {
    setIsLoading(true);
    try {
      let url = '/tenant/suppliers?limit=50';
      if (searchQuery) url += `&search=${encodeURIComponent(searchQuery)}`;

      const response = await apiClient.get(url);
      setSuppliers(response.data.data.suppliers || []);
    } catch (error) {
      console.error('Failed to fetch suppliers:', error);
      toast.error('Failed to load suppliers');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchSuppliers();
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handleFormSuccess = () => {
    setIsModalOpen(false);
    fetchSuppliers();
  };

  const handleEdit = (supplier: any) => {
    setEditingSupplier(supplier);
    setIsModalOpen(true);
  };

  const openNewSupplier = () => {
    setEditingSupplier(null);
    setIsModalOpen(true);
  };

  const handleDelete = async (supplierId: string) => {
    if (!window.confirm('Are you sure you want to deactivate this supplier?')) return;
    try {
      await apiClient.delete(`/tenant/suppliers/${supplierId}`);
      toast.success('Supplier deactivated');
      fetchSuppliers();
    } catch (error) {
      console.error('Delete supplier error:', error);
      toast.error('Failed to deactivate supplier');
    }
  };

  const columns = [
    { key: 'name', label: 'Supplier Name' },
    { key: 'contact_person', label: 'Contact Person' },
    { key: 'email', label: 'Email' },
    { key: 'phone', label: 'Phone' },
    { key: 'status', label: 'Status' }
  ];

  const rows = suppliers.map((s: any) => ({
    id: s.id,
    name: <span className="font-semibold text-foreground">{s.name}</span>,
    contact_person: s.contact_person || '—',
    email: s.email ? <a href={`mailto:${s.email}`} className="text-blue-500 hover:underline">{s.email}</a> : '—',
    phone: s.phone || '—',
    status: (
      <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${
        s.is_active ? 'text-green-600 bg-green-50 dark:bg-green-900/30 dark:text-green-400' 
        : 'text-red-600 bg-red-50 dark:bg-red-900/30 dark:text-red-400'
      }`}>
        {s.is_active ? 'Active' : 'Inactive'}
      </span>
    ),
    rowActions: [
      { key: 'edit', label: 'Edit', icon: 'mdi:pencil' },
      { key: 'delete', label: 'Deactivate', icon: 'mdi:trash', className: 'text-danger' }
    ],
    __record: s
  }));

  const handleRowActionClick = (actionKey: string, row: any) => {
    if (actionKey === 'edit') handleEdit(row.__record);
    if (actionKey === 'delete') handleDelete(row.id);
  };

  return (
    <PageLayout title="Suppliers">
      <EnhancedTableComponent
        columns={columns}
        rows={rows}
        isLoading={isLoading}
        title="Supplier Directory"
        
        showSearch={true}
        searchPlaceholder="Search suppliers..."
        searchValue={searchQuery}
        onSearchChange={setSearchQuery}
        
        showFilter={false} // No specific enums to filter on besides search
        
        showAddButton={true}
        addButtonText="New Supplier"
        onAddButtonClick={openNewSupplier}
        onRowActionClick={handleRowActionClick}
        
        mobileFriendly={true}
      />

      <CustomModal
        isOpen={isModalOpen}
        onOpenChange={() => setIsModalOpen(!isModalOpen)}
        placement="right"
        size="lg"
        classNames={{ base: "sm:w-[500px]" }}
        header={
          <div className="pt-4 px-2">
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
    </PageLayout>
  );
}
