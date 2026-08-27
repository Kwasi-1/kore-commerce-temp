import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import CustomModal from '@/components/modals/modal';
import { Button } from '@/components/ui/button';
import { CurrencyDisplay } from '@/hooks';
import { Icon } from '@iconify/react';
import { format } from 'date-fns';
import apiClient from '@/api/client';
import toast from 'react-hot-toast';
import clsx from 'clsx';

interface SupplierDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  supplier: any | null;
  onEdit: (supplier: any) => void;
  onToggleStatus: (supplier: any) => void;
}

export default function SupplierDetailModal({
  isOpen,
  onClose,
  supplier: initialSupplier,
  onEdit,
  onToggleStatus,
}: SupplierDetailModalProps) {
  const navigate = useNavigate();
  const [supplierDetails, setSupplierDetails] = useState<any>(initialSupplier);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);

  const supplierId = typeof initialSupplier === 'string' ? initialSupplier : initialSupplier?.id;

  useEffect(() => {
    if (!supplierId || !isOpen) return;
    if (typeof initialSupplier === 'object') {
      setSupplierDetails(initialSupplier);
    }

    let isMounted = true;
    setIsLoadingDetails(true);
    apiClient
      .get(`/tenant/suppliers/${supplierId}`)
      .then((res) => {
        if (!isMounted) return;
        const data = res.data?.success?.data?.supplier || res.data?.data?.supplier;
        if (data) {
          setSupplierDetails(data);
        }
      })
      .catch((err) => {
        console.error('Failed to load full supplier details:', err);
      })
      .finally(() => {
        if (isMounted) setIsLoadingDetails(false);
      });

    return () => {
      isMounted = false;
    };
  }, [supplierId, initialSupplier, isOpen]);

  if (!initialSupplier) return null;

  const supplier = supplierDetails || initialSupplier;
  const isActive = supplier.is_active !== false && supplier.isActive !== false;
  const hasDebt = supplier.outstanding_debt && Number(supplier.outstanding_debt) > 0;

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied to clipboard`);
  };

  const poStatusBadge = (status: string) => {
    const s = status?.toLowerCase() || '';
    if (s === 'received') return 'bg-green-50 text-green-700 dark:bg-green-950/40 dark:text-green-400 border-green-200';
    if (s === 'partially_received') return 'bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400 border-blue-200';
    if (s === 'ordered') return 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400 border-amber-200';
    if (s === 'cancelled') return 'bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-400 border-red-200';
    return 'bg-muted text-muted-foreground border-border';
  };

  return (
    <CustomModal
      isOpen={isOpen}
      onOpenChange={onClose}
      placement="right"
      size="lg"
      header={
        <div className="pt-2 px-1 border-b border-border/60 pb-3">
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-xl font-bold text-foreground capitalize tracking-tight font-header">
                  {supplier.name}
                </h2>
                <span
                  className={clsx(
                    'inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold',
                    isActive
                      ? 'text-green-600 bg-green-50 dark:bg-green-950/30'
                      : 'text-red-500 bg-red-50 dark:bg-red-950/30'
                  )}
                >
                  {isActive ? 'Active' : 'Inactive'}
                </span>
              </div>
              <p className="text-xs text-muted-foreground">Supplier Profile & Order Activity</p>
            </div>

            {/* Header Actions */}
            <div className="flex items-center gap-1.5 shrink-0">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  onClose();
                  onEdit(supplier);
                }}
                className="h-8 text-xs font-semibold gap-1 rounded-lg"
              >
                <Icon icon="solar:pen-new-square-linear" className="h-3.5 w-3.5" />
                Edit
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  onClose();
                  onToggleStatus(supplier);
                }}
                className={clsx(
                  'h-8 text-xs font-semibold gap-1 rounded-lg',
                  isActive ? 'text-destructive hover:bg-destructive/10' : 'text-green-600 hover:bg-green-50'
                )}
              >
                <Icon
                  icon={isActive ? 'solar:user-block-rounded-linear' : 'solar:user-check-rounded-linear'}
                  className="h-3.5 w-3.5"
                />
                {isActive ? 'Deactivate' : 'Activate'}
              </Button>
            </div>
          </div>
        </div>
      }
      body={
        <div className="py-3 space-y-5">
          {/* Key Metrics / Snapshot */}
          <div className="grid grid-cols-3 gap-2.5">
            {/* Outstanding Debt */}
            <div
              onClick={() => {
                if (hasDebt) {
                  onClose();
                  navigate(`/inventory/supplier-credit?search=${encodeURIComponent(supplier.name)}`);
                }
              }}
              className={clsx(
                'p-3 rounded-xl border transition-all flex flex-col justify-between',
                hasDebt
                  ? 'bg-amber-500/5 border-amber-500/20 hover:border-amber-500/40 cursor-pointer group'
                  : 'bg-card border-border/70'
              )}
            >
              <div className="flex items-center justify-between text-[11px] font-medium text-muted-foreground">
                <span>Outstanding Debt</span>
                {hasDebt && (
                  <Icon
                    icon="solar:arrow-right-up-linear"
                    className="h-3 w-3 text-amber-600 opacity-60 group-hover:opacity-100 transition-opacity"
                  />
                )}
              </div>
              <div className="mt-1.5 font-bold text-sm sm:text-base text-foreground">
                {hasDebt ? (
                  <span className="text-amber-600 dark:text-amber-400">
                    <CurrencyDisplay amount={supplier.outstanding_debt} showStyling={false} />
                  </span>
                ) : (
                  <span className="text-muted-foreground text-xs font-normal">GHS 0.00 (Clear)</span>
                )}
              </div>
            </div>

            {/* Total Orders Count */}
            <div className="p-3 rounded-xl border bg-card border-border/70 flex flex-col justify-between">
              <span className="text-[11px] font-medium text-muted-foreground">Total POs</span>
              <div className="mt-1.5 font-bold text-sm sm:text-base text-foreground">
                {supplier.total_orders !== undefined ? `${supplier.total_orders} Orders` : '—'}
              </div>
            </div>

            {/* Created Since */}
            <div className="p-3 rounded-xl border bg-card border-border/70 flex flex-col justify-between">
              <span className="text-[11px] font-medium text-muted-foreground">Supplier Since</span>
              <div className="mt-1.5 font-semibold text-xs sm:text-sm text-foreground">
                {supplier.dateCreated ? format(new Date(supplier.dateCreated), 'MMM dd, yyyy') : '—'}
              </div>
            </div>
          </div>

          {/* Supplier Notes Banner (if present) */}
          {supplier.notes && (
            <div className="p-3.5 rounded-xl bg-muted/50 border border-border/80 space-y-1">
              <div className="flex items-center gap-1.5 text-xs font-bold text-foreground">
                <Icon icon="solar:notes-linear" className="h-4 w-4 text-primary" />
                <span>Internal Notes</span>
              </div>
              <p className="text-xs text-foreground/80 leading-relaxed whitespace-pre-wrap">
                {supplier.notes}
              </p>
            </div>
          )}

          {/* Contact & Business Details Card */}
          <div className="p-3.5 sm:p-4 rounded-xl border border-border/80 bg-card space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <Icon icon="solar:user-id-linear" className="h-4 w-4 text-primary" />
              Contact & Business Information
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              {/* Contact Person */}
              <div>
                <span className="text-muted-foreground block text-[11px]">Contact Person</span>
                <span className="font-semibold text-foreground capitalize">
                  {supplier.contact_person || supplier.contactPerson || '—'}
                </span>
              </div>

              {/* Phone */}
              <div>
                <span className="text-muted-foreground block text-[11px]">Phone Number</span>
                {supplier.phone ? (
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="font-medium text-foreground">{supplier.phone}</span>
                    <button
                      type="button"
                      onClick={() => copyToClipboard(supplier.phone, 'Phone number')}
                      className="text-muted-foreground hover:text-foreground transition-colors p-0.5"
                      title="Copy phone"
                    >
                      <Icon icon="solar:copy-linear" className="h-3.5 w-3.5" />
                    </button>
                    <a
                      href={`tel:${supplier.phone}`}
                      className="text-primary hover:underline p-0.5"
                      title="Call supplier"
                    >
                      <Icon icon="solar:phone-calling-linear" className="h-3.5 w-3.5" />
                    </a>
                  </div>
                ) : (
                  <span className="text-muted-foreground">—</span>
                )}
              </div>

              {/* Email */}
              <div>
                <span className="text-muted-foreground block text-[11px]">Email Address</span>
                {supplier.email ? (
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="font-medium text-foreground truncate max-w-[170px]">{supplier.email}</span>
                    <button
                      type="button"
                      onClick={() => copyToClipboard(supplier.email, 'Email address')}
                      className="text-muted-foreground hover:text-foreground transition-colors p-0.5 shrink-0"
                      title="Copy email"
                    >
                      <Icon icon="solar:copy-linear" className="h-3.5 w-3.5" />
                    </button>
                    <a
                      href={`mailto:${supplier.email}`}
                      className="text-primary hover:underline p-0.5 shrink-0"
                      title="Send email"
                    >
                      <Icon icon="solar:letter-linear" className="h-3.5 w-3.5" />
                    </a>
                  </div>
                ) : (
                  <span className="text-muted-foreground">—</span>
                )}
              </div>

              {/* Tax ID / TIN */}
              <div>
                <span className="text-muted-foreground block text-[11px]">Tax ID / TIN</span>
                <span className="font-medium text-foreground">
                  {supplier.tax_id || supplier.taxId || '—'}
                </span>
              </div>

              {/* Physical Address */}
              <div className="sm:col-span-2">
                <span className="text-muted-foreground block text-[11px]">Physical Address</span>
                <span className="font-medium text-foreground">
                  {supplier.address || '—'}
                </span>
              </div>
            </div>
          </div>

          {/* Quick Actions & Recent Purchase Orders */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <Icon icon="solar:box-minimalistic-linear" className="h-4 w-4 text-primary" />
                Recent Purchase Orders
              </h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  onClose();
                  navigate(`/inventory/purchase-orders?search=${encodeURIComponent(supplier.name)}`);
                }}
                className="h-7 text-[11px] font-semibold text-primary hover:underline px-2"
              >
                View All POs
              </Button>
            </div>

            {/* PO List */}
            {isLoadingDetails ? (
              <div className="text-center py-6 text-xs text-muted-foreground animate-pulse">
                Loading order activity...
              </div>
            ) : supplier.recent_purchase_orders && supplier.recent_purchase_orders.length > 0 ? (
              <div className="space-y-2">
                {supplier.recent_purchase_orders.map((po: any) => (
                  <div
                    key={po.id}
                    className="flex items-center justify-between p-2.5 rounded-xl border border-border bg-card/60 hover:bg-muted/50 transition-colors text-xs"
                  >
                    <div className="space-y-0.5">
                      <div className="font-semibold text-foreground flex items-center gap-1.5">
                        <span>{po.reference_number}</span>
                        <span
                          className={clsx(
                            'px-1.5 py-0.5 rounded text-[10px] font-bold border uppercase tracking-wider',
                            poStatusBadge(po.status)
                          )}
                        >
                          {po.status?.replace(/_/g, ' ')}
                        </span>
                      </div>
                      <span className="text-[11px] text-muted-foreground">
                        {po.date_created ? format(new Date(po.date_created), 'MMM dd, yyyy') : '—'}
                      </span>
                    </div>

                    <div className="text-right">
                      <span className="font-semibold text-foreground block">
                        <CurrencyDisplay amount={po.total_amount} />
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-5 rounded-xl border border-dashed border-border text-xs text-muted-foreground">
                No purchase orders recorded for this supplier yet.
              </div>
            )}
          </div>
        </div>
      }
      footer={
        <div className="flex items-center justify-between w-full pt-2">
          {hasDebt ? (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                onClose();
                navigate(`/inventory/supplier-credit?search=${encodeURIComponent(supplier.name)}`);
              }}
              className="text-xs font-semibold text-amber-600 dark:text-amber-400 border-amber-500/30 gap-1.5 rounded-lg"
            >
              <Icon icon="solar:card-recive-linear" className="h-3.5 w-3.5" />
              Open Credit Ledger
            </Button>
          ) : (
            <div />
          )}

          <Button
            size="sm"
            onClick={() => {
              onClose();
              navigate(`/inventory/purchase-orders`);
            }}
            className="text-xs font-semibold gap-1.5 rounded-lg"
          >
            <Icon icon="solar:add-circle-linear" className="h-3.5 w-3.5" />
            New Purchase Order
          </Button>
        </div>
      }
    />
  );
}
