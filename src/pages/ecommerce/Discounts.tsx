import React, { useState, useEffect, useMemo } from 'react';
import PageLayout from '@/components/layout/PageLayout';
import EnhancedTableComponent from '@/components/shared/MainTableComponent';
import CustomModal from '@/components/modals/modal';
import DiscountForm from '@/components/ecommerce/DiscountForm';
import apiClient from '@/api/client';
import toast from 'react-hot-toast';
import { 
  Tag, 
  Plus, 
  Edit2, 
  Trash2, 
  RefreshCw, 
  Percent, 
  DollarSign, 
  Calendar, 
  Users, 
  Loader2,
  CheckCircle2,
  XCircle,
  AlertCircle
} from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { CurrencyDisplay } from '@/hooks';
import { useIsMobile } from '@/hooks/useScreenSize';
import {
  MobileDashboardWrapper,
  MobileActionCapsuleBar,
  MobileActivitySheet,
} from '@/components/mobile-dashboard';

export default function Discounts() {
  const isMobile = useIsMobile();
  const [discounts, setDiscounts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeMobileTab, setActiveMobileTab] = useState('all');
  
  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingDiscount, setEditingDiscount] = useState<any>(null);

  const fetchDiscounts = async () => {
    setIsLoading(true);
    try {
      const response = await apiClient.get('/tenant/discounts');
      setDiscounts(response.data.success?.data?.discounts || response.data?.discounts || []);
    } catch (error) {
      console.error('Failed to fetch discounts:', error);
      toast.error('Failed to load discounts');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDiscounts();
  }, []);

  const handleToggleActive = async (discount: any, checked: boolean) => {
    // Optimistic update
    setDiscounts(prev => prev.map(d => d.id === discount.id ? { ...d, is_active: checked } : d));
    
    try {
      await apiClient.post(`/tenant/discounts/${discount.id}/toggle`, { is_active: checked });
      toast.success(`Discount ${discount.code} ${checked ? 'activated' : 'deactivated'}`);
    } catch (error) {
      // Revert on failure
      setDiscounts(prev => prev.map(d => d.id === discount.id ? { ...d, is_active: !checked } : d));
      toast.error('Failed to toggle discount status');
    }
  };

  const handleDelete = async (id: string, code: string) => {
    if (!window.confirm(`Are you sure you want to delete discount "${code}"?`)) return;
    
    try {
      await apiClient.delete(`/tenant/discounts/${id}`);
      toast.success('Discount deleted');
      fetchDiscounts();
    } catch (error) {
      toast.error('Failed to delete discount');
    }
  };

  const handleCreate = () => {
    setEditingDiscount(null);
    setIsModalOpen(true);
  };

  const handleEdit = (discount: any) => {
    setEditingDiscount(discount);
    setIsModalOpen(true);
  };

  const handleSuccess = () => {
    setIsModalOpen(false);
    fetchDiscounts();
  };

  // Filter discounts based on search query and mobile tab
  const filteredDiscounts = useMemo(() => {
    return discounts.filter((d: any) => {
      // Search
      const matchesSearch = (d.code || '').toLowerCase().includes(searchQuery.toLowerCase());
      if (!matchesSearch) return false;

      // Tab filter
      if (activeMobileTab === 'active') return d.is_active;
      if (activeMobileTab === 'inactive') return !d.is_active;
      if (activeMobileTab === 'percentage') return d.type === 'percentage';
      if (activeMobileTab === 'fixed') return d.type === 'fixed';
      return true;
    });
  }, [discounts, searchQuery, activeMobileTab]);

  const activeCount = useMemo(() => discounts.filter((d: any) => d.is_active).length, [discounts]);
  const inactiveCount = useMemo(() => discounts.filter((d: any) => !d.is_active).length, [discounts]);

  const mobileTabs = [
    { id: 'all', label: 'All' },
    { id: 'active', label: 'Active' },
    { id: 'inactive', label: 'Inactive' },
    { id: 'percentage', label: 'Percentage %' },
    { id: 'fixed', label: 'Fixed GHS' },
  ];

  const columns = [
    { key: 'code', label: 'Code' },
    { key: 'type', label: 'Type' },
    { key: 'value', label: 'Value' },
    { key: 'min_order', label: 'Min Order' },
    { key: 'uses', label: 'Uses' },
    { key: 'expiry', label: 'Expiry' },
    { key: 'status', label: 'Status' },
    { key: 'actions', label: 'Actions' }
  ];

  const rows = discounts.map((d: any) => {
    return {
      id: d.id,
      code: <span className="font-mono font-bold px-2 py-1 bg-muted/50 rounded-md text-foreground tracking-widest">{d.code}</span>,
      type: (
        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium capitalize ${d.type === 'percentage' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300' : 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'}`}>
          {d.type}
        </span>
      ),
      value: <span className="font-semibold">{d.type === 'percentage' ? `${d.value}%` : <CurrencyDisplay amount={d.value} />}</span>,
      min_order: <span className="text-muted-foreground">{d.min_order_amount ? <CurrencyDisplay amount={d.min_order_amount} /> : 'None'}</span>,
      uses: (
        <div className="flex flex-col text-sm">
          <span>{d.uses_count} / {d.max_uses ? d.max_uses : '∞'}</span>
          {d.max_uses && <span className="text-[10px] text-muted-foreground">Uses left: {Math.max(0, d.max_uses - d.uses_count)}</span>}
        </div>
      ),
      expiry: <span className="text-muted-foreground">{d.expires_at ? new Date(d.expires_at).toLocaleDateString() : 'No expiry'}</span>,
      status: (
        <Switch
          checked={d.is_active}
          onCheckedChange={(checked) => handleToggleActive(d, checked)}
        />
      ),
      actions: (
        <div className="flex items-center gap-2">
          <button onClick={() => handleEdit(d)} className="p-1.5 text-muted-foreground hover:text-primary transition-colors rounded-md hover:bg-muted">
            <Edit2 className="h-4 w-4" />
          </button>
          <button onClick={() => handleDelete(d.id, d.code)} className="p-1.5 text-muted-foreground hover:text-red-500 transition-colors rounded-md hover:bg-red-50 dark:hover:bg-red-900/20">
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      ),
      __record: d
    };
  });

  return (
    <PageLayout 
      title="Discounts & Promotions"
      subtitle={isMobile ? `${discounts.length} promo codes` : undefined}
      headerVariant="action-bridge"
      constrainHeight={true}
      subtitleStyles="!block -mt-3 mb-2 md:-mt-4 md:mb-2 text-[11px] md:text-sm"
    >
      {/* ========================================================================= */}
      {/* MOBILE VIEW (Hidden >= md, Block < md)                                    */}
      {/* ========================================================================= */}
      <MobileDashboardWrapper className="block md:hidden">
        {/* 1. Action Capsule Bar */}
        <MobileActionCapsuleBar
          searchConfig={{
            value: searchQuery,
            onChange: setSearchQuery,
            placeholder: "Search coupon code..."
          }}
          actions={[
            {
              label: "New Code",
              icon: <Plus className="h-3.5 w-3.5 text-primary" />,
              onClick: handleCreate
            },
            {
              label: "Refresh",
              icon: <RefreshCw className="h-3.5 w-3.5 text-primary" />,
              onClick: fetchDiscounts
            }
          ]}
        />

        {/* 2. Activity Sheet */}
        <MobileActivitySheet
          title="Promo Coupons"
          secondary={true}
          tabs={mobileTabs}
          activeTab={activeMobileTab}
          onTabChange={setActiveMobileTab}
          totalCount={filteredDiscounts.length}
          currentCount={filteredDiscounts.length}
        >
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground gap-2">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
              <p className="text-xs">Loading discounts...</p>
            </div>
          ) : filteredDiscounts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground gap-2 text-center px-4">
              <Tag className="h-8 w-8 text-muted-foreground/50 mb-1" />
              <p className="text-sm font-semibold text-foreground">No discounts found</p>
              <p className="text-xs text-muted-foreground">
                {searchQuery ? "No coupon matching your search" : "Tap '+ New Code' above to create your first promotion"}
              </p>
            </div>
          ) : (
            filteredDiscounts.map((discount) => {
              const isPercentage = discount.type === 'percentage';
              const formattedExpiry = discount.expires_at && !isNaN(new Date(discount.expires_at).getTime())
                ? new Date(discount.expires_at).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })
                : 'No expiration';

              return (
                <div
                  key={discount.id}
                  className="py-3.5 px-2 flex flex-col gap-2.5 text-xs bg-card hover:bg-muted/10 rounded-xl transition-all border border-border/40 shadow-2xs my-1"
                >
                  {/* Top Line: Code badge + Type/Value pill + Active toggle */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="flex items-center gap-1.5 font-mono font-bold text-xs bg-muted/60 text-foreground border border-border px-2.5 py-1 rounded-md tracking-wider">
                        <Tag className="h-3.5 w-3.5 text-muted-foreground" />
                        <span>{discount.code}</span>
                      </div>

                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        isPercentage 
                          ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20' 
                          : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                      }`}>
                        {isPercentage ? `${discount.value}% OFF` : <CurrencyDisplay amount={discount.value} showStyling={false} />}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <Switch
                        checked={discount.is_active}
                        onCheckedChange={(checked) => handleToggleActive(discount, checked)}
                      />
                    </div>
                  </div>

                  {/* Middle Line: Conditions & Rules */}
                  <div className="grid grid-cols-2 gap-2 text-[11px] text-muted-foreground bg-muted/20 p-2 rounded-lg">
                    <div className="flex items-center gap-1.5 truncate">
                      <DollarSign className="h-3 w-3 text-muted-foreground shrink-0" />
                      <span className="truncate">
                        Min Order: {discount.min_order_amount ? <CurrencyDisplay amount={discount.min_order_amount} showStyling={false} /> : 'None'}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 truncate">
                      <Users className="h-3 w-3 text-muted-foreground shrink-0" />
                      <span>
                        Uses: {discount.uses_count || 0}/{discount.max_uses || '∞'}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 col-span-2 text-[10px] text-muted-foreground truncate pt-0.5">
                      <Calendar className="h-3 w-3 text-muted-foreground shrink-0" />
                      <span>{formattedExpiry}</span>
                    </div>
                  </div>

                  {/* Bottom Line: Actions */}
                  <div className="flex items-center justify-between gap-2 pt-1 border-t border-border/20">
                    <span className={`text-[10px] font-semibold flex items-center gap-1 ${
                      discount.is_active ? 'text-emerald-600 dark:text-emerald-400' : 'text-muted-foreground'
                    }`}>
                      {discount.is_active ? <CheckCircle2 className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
                      {discount.is_active ? 'Active & Redeemable' : 'Inactive'}
                    </span>

                    <div className="flex items-center gap-1.5">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => handleEdit(discount)}
                        className="h-7 px-2.5 text-[11px] font-semibold rounded-lg border-border gap-1"
                      >
                        <Edit2 className="h-3 w-3 text-muted-foreground" />
                        <span>Edit</span>
                      </Button>

                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(discount.id, discount.code)}
                        className="h-7 px-2 text-[11px] text-destructive hover:bg-destructive/10 rounded-lg"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </MobileActivitySheet>
      </MobileDashboardWrapper>

      {/* ========================================================================= */}
      {/* DESKTOP VIEW (Hidden < md, Flex >= md)                                    */}
      {/* ========================================================================= */}
      <div className="hidden md:flex flex-col flex-1 min-h-0 relative h-full">
        <EnhancedTableComponent
          columns={columns}
          rows={rows}
          isLoading={isLoading}
          title="Active Discounts"
          
          showAddButton={true}
          addButtonText="Create Discount"
          addButtonIcon="ph:plus-bold"
          onAddButtonClick={handleCreate}
          
          showSearch={true}
          searchPlaceholder="Search by code..."
          onRefresh={fetchDiscounts}
        />
      </div>

      <CustomModal
        isOpen={isModalOpen}
        onOpenChange={() => setIsModalOpen(!isModalOpen)}
        placement="right"
        size="md"
        header={
          <div className="flex items-center gap-2">
            <Tag className="h-5 w-5 text-primary" />
            <h2 className="text-xl font-bold">{editingDiscount ? 'Edit Discount' : 'Create Discount'}</h2>
          </div>
        }
        body={
          <DiscountForm
            discount={editingDiscount}
            onSuccess={handleSuccess}
            onCancel={() => setIsModalOpen(false)}
          />
        }
      />
    </PageLayout>
  );
}

