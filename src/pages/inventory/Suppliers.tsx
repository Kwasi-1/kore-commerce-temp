import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import PageLayout from '@/components/layout/PageLayout';
import EnhancedTableComponent from '@/components/shared/MainTableComponent';
import CustomModal from '@/components/modals/modal';
import SupplierForm from '@/components/inventory/SupplierForm';
import SupplierStatusModal from '@/components/inventory/SupplierStatusModal';
import SupplierDetailModal from '@/components/inventory/SupplierDetailModal';
import apiClient from '@/api/client';
import toast from 'react-hot-toast';
import { useIsMobile } from '@/hooks/useScreenSize';
import { CurrencyDisplay } from '@/hooks';

import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { Icon } from '@iconify/react';
import { 
  UserPlus, 
  CreditCard, 
  RefreshCw, 
  Building2, 
  Phone, 
  Mail, 
  ExternalLink,
  PhoneCall
} from 'lucide-react';
import {
  MobileDashboardWrapper,
  MobileActionCapsuleBar,
  MobileActivitySheet,
} from '@/components/mobile-dashboard';

export default function Suppliers() {
  const navigate = useNavigate();
  const location = useLocation();
  const isMobile = useIsMobile();
  const staffUser = useAuthStore((state) => state.staffUser);
  const showCreditTab = staffUser?.role === 'owner' || staffUser?.role === 'manager';

  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [pagination, setPagination] = useState<any>(null);
  
  // Search
  const [searchQuery, setSearchQuery] = useState('');
  const [mobileTab, setMobileTab] = useState('all');
  
  // Detail Modal state
  const [selectedSupplier, setSelectedSupplier] = useState<any>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

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
      fetchSuppliers(pagination?.page || 1);
    } catch (error: any) {
      console.error('Toggle supplier status error:', error);
      toast.error(error.response?.data?.error?.message || 'Failed to update supplier status');
    } finally {
      setIsStatusLoading(false);
    }
  };

  const filteredMobileSuppliers = useMemo(() => {
    if (mobileTab === 'active') return suppliers.filter(s => (s.is_active ?? s.isActive) !== false);
    if (mobileTab === 'inactive') return suppliers.filter(s => (s.is_active ?? s.isActive) === false);
    if (mobileTab === 'with_debt') return suppliers.filter(s => Number(s.outstanding_debt || 0) > 0);
    return suppliers;
  }, [suppliers, mobileTab]);

  const columns = [
    { key: 'name', label: 'Supplier Name' },
    { key: 'contact_person', label: 'Contact Person' },
    { key: 'email', label: 'Email' },
    { key: 'phone', label: 'Phone' },
    { key: 'outstanding_debt', label: 'Outstanding Debt' },
    { key: 'status', label: 'Status' }
  ];

  const rows = suppliers.map((supplier) => {
    const isActive = supplier.is_active !== undefined ? supplier.is_active : supplier.isActive;
    
    return {
      id: supplier.id,
      name: (
        <span className="font-semibold text-foreground">
          {supplier.name}
        </span>
      ),
      contact_person: (
        <span className="text-foreground capitalize">
          {supplier.contact_person || supplier.contactPerson || '—'}
        </span>
      ),
      email: (
        <span className="text-muted-foreground">
          {supplier.email || '—'}
        </span>
      ),
      phone: (
        <span className="">
          {supplier.phone || '—'}
        </span>
      ),
      outstanding_debt: (
        supplier.outstanding_debt && Number(supplier.outstanding_debt) > 0 ? (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              navigate(`/inventory/supplier-credit?search=${encodeURIComponent(supplier.name)}`);
            }}
            className="group inline-flex items-center gap-1 font-semibold text-amber-600 dark:text-amber-400 hover:text-amber-700 dark:hover:text-amber-300 hover:underline transition-all text-left cursor-pointer"
            title={`View ${supplier.name} in Credit Ledger`}
          >
            <CurrencyDisplay amount={supplier.outstanding_debt} showStyling={false}/>
            <Icon icon="solar:arrow-right-up-linear" className="h-3.5 w-3.5 opacity-60 group-hover:opacity-100 transition-opacity" />
          </button>
        ) : (
          <span className="text-muted-foreground">—</span>
        )
      ),
      status: (
        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold ${
          isActive ? 'text-green-600 bg-green-50 dark:bg-green-950/30' : 'text-red-500 bg-red-50 dark:bg-red-950/30'
        }`}>
          {isActive ? 'Active' : 'Inactive'}
        </span>
      ),
      rowActions: [
        { key: 'edit', label: 'Edit Supplier', icon: 'mdi:pencil-outline' },
        { 
          key: 'toggle_status', 
          label: isActive ? 'Deactivate' : 'Activate', 
          icon: isActive ? 'mdi:account-off-outline' : 'mdi:account-check-outline' 
        }
      ],
      __record: supplier
    };
  });

  const handleRowClick = (rowOrKey: any) => {
    const id = typeof rowOrKey === 'object' ? (rowOrKey?.id || rowOrKey?.__record?.id) : rowOrKey;
    const supplier = suppliers.find((s) => s.id === id) || (typeof rowOrKey === 'object' ? (rowOrKey.__record || rowOrKey) : null);
    if (supplier) {
      setSelectedSupplier(supplier);
      setIsDetailModalOpen(true);
    }
  };

  const handleRowActionClick = (actionKey: string, row: any) => {
    if (actionKey === 'edit') handleEdit(row.__record);
    if (actionKey === 'toggle_status') {
      setStatusModalSupplier(row.__record);
      setIsStatusModalOpen(true);
    }
  };

  return (
    <PageLayout 
      title="Suppliers" 
      subtitle={
        isMobile ? (
          `${suppliers.length} supplier${suppliers.length !== 1 ? 's' : ''} listed`
        ) : undefined
      }
      headerVariant="action-bridge"
      constrainHeight={true}
      subtitleStyles="!block -mt-3 mb-2 md:-mt-4 md:mb-2 text-[11px] md:text-sm"
    >
      {/* ========================================================================= */}
      {/* MOBILE SUPPLIERS VIEW (Hidden >= md, Block < md)                          */}
      {/* ========================================================================= */}
      <MobileDashboardWrapper className="block md:hidden">
        {/* Action Capsule Bar (Search + New Supplier + Credit Ledger) */}
        <MobileActionCapsuleBar
          searchConfig={{
            value: searchQuery,
            onChange: setSearchQuery,
            placeholder: "Search suppliers...",
          }}
          actions={[
            {
              label: 'New Supplier',
              icon: <UserPlus className="h-3.5 w-3.5 text-primary" />,
              onClick: openNewSupplier,
            },
            ...(showCreditTab ? [
              {
                label: 'Credit Ledger',
                icon: <CreditCard className="h-3.5 w-3.5 text-primary" />,
                onClick: () => navigate('/inventory/supplier-credit'),
              }
            ] : []),
            {
              icon: <RefreshCw className="h-3.5 w-3.5 text-primary -mx-1" />,
              onClick: () => fetchSuppliers(1),
            },
          ]}
        />

        {/* Supplier Directory Activity Sheet */}
        <MobileActivitySheet
          title="Supplier Directory"
          tabs={[
            { id: 'all', label: 'All' },
            { id: 'active', label: 'Active' },
            { id: 'with_debt', label: 'With Debt' },
            { id: 'inactive', label: 'Inactive' },
          ]}
          activeTab={mobileTab}
          onTabChange={setMobileTab}
        >
          {isLoading ? (
            <div className="py-8 text-center"><Spinner /></div>
          ) : filteredMobileSuppliers.length === 0 ? (
            <div className="py-10 text-center text-xs text-muted-foreground">
              No suppliers found matching your filter or search.
            </div>
          ) : (
            filteredMobileSuppliers.map((supplier) => {
              const isActive = supplier.is_active !== undefined ? supplier.is_active : supplier.isActive;
              const hasDebt = supplier.outstanding_debt && Number(supplier.outstanding_debt) > 0;

              return (
                <div
                  key={supplier.id}
                  onClick={() => handleRowClick(supplier)}
                  className="py-3 flex items-center justify-between text-xs cursor-pointer hover:bg-muted/20 px-1 rounded-lg transition-colors gap-3 border-b border-border/20 last:border-0"
                >
                  {/* Left: Building Icon + Details */}
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className="h-10 w-10 rounded-lg shrink-0 overflow-hidden bg-muted/60 flex items-center justify-center border border-border text-muted-foreground font-bold">
                      <Building2 className="h-4 w-4 text-foreground/80" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-bold text-foreground truncate max-w-[170px]">
                        {supplier.name}
                      </p>
                      <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground truncate max-w-[180px] mt-0.5">
                        {supplier.contact_person || supplier.contactPerson ? (
                          <span className="capitalize">{supplier.contact_person || supplier.contactPerson}</span>
                        ) : (
                          <span>No contact person</span>
                        )}
                        {supplier.phone && (
                          <>
                            <span>&middot;</span>
                            <span>{supplier.phone}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Right: Debt & Status */}
                  <div className="text-right shrink-0 flex flex-col items-end gap-1">
                    {hasDebt ? (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/inventory/supplier-credit?search=${encodeURIComponent(supplier.name)}`);
                        }}
                        className="inline-flex items-center gap-0.5 font-bold text-amber-600 dark:text-amber-400 text-xs hover:underline"
                      >
                        <CurrencyDisplay amount={supplier.outstanding_debt} showStyling={false}/>
                        <ExternalLink className="h-3 w-3 opacity-70" />
                      </button>
                    ) : (
                      <span className="text-[11px] text-muted-foreground">—</span>
                    )}

                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      isActive 
                        ? 'text-emerald-600 bg-emerald-500/10' 
                        : 'text-destructive bg-destructive/10'
                    }`}>
                      {isActive ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </MobileActivitySheet>
      </MobileDashboardWrapper>

      {/* ========================================================================= */}
      {/* DESKTOP SUPPLIERS VIEW (Hidden < md, Flex >= md)                          */}
      {/* ========================================================================= */}
      <div className="hidden md:flex flex-col flex-1 min-h-0 relative h-full">
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
          
          showTopContent={true}
          topActions={
            showCreditTab
              ? [
                  {
                    title: "Credit Ledger",
                    icon: "solar:card-recive-linear",
                    variant: "flat",
                    className: "border border-muted/60 text-foreground font-semibold rounded-[5px] h-[40px] bg-muted/60 hover:bg-muted text-xs",
                    onPress: () => navigate('/inventory/supplier-credit'),
                  },
                ]
              : []
          }
          
          showAddButton={true}
          addButtonText="New Supplier"
          onAddButtonClick={openNewSupplier}
          onRowActionClick={handleRowActionClick}
          onclick={handleRowClick}
          
          mobileFriendly={true}
        />
      </div>

      {/* Supplier Details Modal */}
      <SupplierDetailModal
        isOpen={isDetailModalOpen}
        onClose={() => {
          setIsDetailModalOpen(false);
          setSelectedSupplier(null);
        }}
        supplier={selectedSupplier}
        onEdit={(s) => {
          setIsDetailModalOpen(false);
          handleEdit(s);
        }}
        onToggleStatus={(s) => {
          setIsDetailModalOpen(false);
          setStatusModalSupplier(s);
          setIsStatusModalOpen(true);
        }}
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
