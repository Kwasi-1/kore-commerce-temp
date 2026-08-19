import React, { useState, useMemo } from 'react';
import CustomModal from '@/components/modals/modal';
import { Button } from '@/components/ui/button';
import { Icon } from '@iconify/react/dist/iconify.js';
import apiClient from '@/api/client';
import toast from 'react-hot-toast';
import clsx from 'clsx';

interface ImportStaffToPayrollModalProps {
  isOpen: boolean;
  onClose: () => void;
  staffList: any[];
  existingProfiles: any[];
  onSuccess: () => void;
  onConfigureSingle?: (staff: any) => void;
}

export default function ImportStaffToPayrollModal({
  isOpen,
  onClose,
  staffList,
  existingProfiles,
  onSuccess,
  onConfigureSingle,
}: ImportStaffToPayrollModalProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStaffIds, setSelectedStaffIds] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Compute platform staff who are NOT already on the payroll roster
  const unconfiguredStaff = useMemo(() => {
    const configuredIds = new Set(
      existingProfiles
        .filter((p) => !p.is_off_platform && p.staff_id)
        .map((p) => p.staff_id)
    );

    return staffList.filter((staff) => !configuredIds.has(staff.id));
  }, [staffList, existingProfiles]);

  // Filter unconfigured staff by search query
  const filteredStaff = useMemo(() => {
    if (!searchQuery.trim()) return unconfiguredStaff;
    const q = searchQuery.toLowerCase();
    return unconfiguredStaff.filter(
      (s) =>
        (s.name && s.name.toLowerCase().includes(q)) ||
        (s.first_name && s.first_name.toLowerCase().includes(q)) ||
        (s.last_name && s.last_name.toLowerCase().includes(q)) ||
        (s.email && s.email.toLowerCase().includes(q)) ||
        (s.role && s.role.toLowerCase().includes(q))
    );
  }, [unconfiguredStaff, searchQuery]);

  // Reset selections when modal opens or unconfigured staff changes
  React.useEffect(() => {
    if (isOpen) {
      setSelectedStaffIds([]);
      setSearchQuery('');
    }
  }, [isOpen]);

  const toggleSelectAll = () => {
    if (selectedStaffIds.length === filteredStaff.length) {
      setSelectedStaffIds([]);
    } else {
      setSelectedStaffIds(filteredStaff.map((s) => s.id));
    }
  };

  const toggleSelectStaff = (id: string) => {
    setSelectedStaffIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleBatchImport = async () => {
    if (selectedStaffIds.length === 0) return;

    setIsSubmitting(true);
    try {
      const selectedMembers = unconfiguredStaff.filter((s) =>
        selectedStaffIds.includes(s.id)
      );

      // Create a starter profile for each selected staff
      const promises = selectedMembers.map((staff) => {
        const fullName =
          staff.name ||
          `${staff.first_name || ''} ${staff.last_name || ''}`.trim() ||
          'Staff Member';
        const roleTitle = staff.role ? String(staff.role).toUpperCase() : 'Staff';

        return apiClient.post('/tenant/payroll/profile', {
          staff_id: staff.id,
          full_name: fullName,
          role_title: roleTitle,
          compensation_type: 'monthly_salary',
          base_amount: 1, // starter base amount
          payment_method: 'bank_transfer',
          bank_or_momo_name: 'Ecobank Ghana',
          account_number: '',
        });
      });

      await Promise.allSettled(promises);

      toast.success(
        `${selectedStaffIds.length} staff member${
          selectedStaffIds.length > 1 ? 's' : ''
        } imported to payroll roster`
      );
      onSuccess();
      onClose();
    } catch (error) {
      console.error('Import staff error:', error);
      toast.error('Failed to import some staff members');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getInitials = (staff: any) => {
    const name = staff.name || `${staff.first_name || ''} ${staff.last_name || ''}`.trim();
    if (!name) return 'ST';
    const parts = name.split(' ');
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    return name.slice(0, 2).toUpperCase();
  };

  return (
    <CustomModal
      isOpen={isOpen}
      onOpenChange={onClose}
      size="lg"
      placement="center"
      classNames={{ base: "max-w-xl" }}
      header={
        <div className="pt-2 px-1 border-b border-border/70 pb-3">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-primary/10 text-primary shrink-0">
              <Icon icon="solar:user-plus-linear" className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-foreground">
                Import Platform Staff to Payroll
              </h2>
              <p className="text-xs text-muted-foreground font-normal">
                Select registered team members from your staff directory to add to the payroll roster.
              </p>
            </div>
          </div>
        </div>
      }
      body={
        <div className="space-y-4 py-2 text-xs">
          {unconfiguredStaff.length === 0 ? (
            <div className="py-12 px-4 text-center space-y-2 rounded-xl border border-dashed border-border/80 bg-muted/20">
              <div className="h-10 w-10 rounded-full bg-muted/60 flex items-center justify-center text-muted-foreground mx-auto">
                <Icon icon="solar:check-circle-linear" className="h-5 w-5 text-emerald-500" />
              </div>
              <h3 className="text-sm font-bold text-foreground">All Platform Staff Are on Payroll</h3>
              <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                Every registered platform staff user is already configured on the payroll roster.
              </p>
            </div>
          ) : (
            <>
              {/* Search & Select All Bar */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                <div className="relative flex-1">
                  <Icon
                    icon="solar:magnifer-linear"
                    className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground"
                  />
                  <input
                    type="text"
                    placeholder="Search staff by name, email, or role..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-border bg-background placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>

                <button
                  type="button"
                  onClick={toggleSelectAll}
                  className="text-xs font-semibold text-primary hover:underline self-end sm:self-auto shrink-0 flex items-center gap-1"
                >
                  <Icon icon="solar:check-square-linear" className="h-3.5 w-3.5" />
                  <span>
                    {selectedStaffIds.length === filteredStaff.length && filteredStaff.length > 0
                      ? 'Deselect All'
                      : `Select All (${filteredStaff.length})`}
                  </span>
                </button>
              </div>

              {/* Staff List */}
              <div className="space-y-2 max-h-[340px] overflow-y-auto pr-1">
                {filteredStaff.length === 0 ? (
                  <div className="py-8 text-center text-muted-foreground">
                    <p>No unconfigured staff matching "{searchQuery}"</p>
                  </div>
                ) : (
                  filteredStaff.map((staff) => {
                    const isSelected = selectedStaffIds.includes(staff.id);
                    const displayName =
                      staff.name ||
                      `${staff.first_name || ''} ${staff.last_name || ''}`.trim() ||
                      'Staff Member';

                    return (
                      <div
                        key={staff.id}
                        onClick={() => toggleSelectStaff(staff.id)}
                        className={clsx(
                          'flex items-center justify-between gap-3 p-3 rounded-xl border transition-all cursor-pointer select-none',
                          isSelected
                            ? 'bg-primary/5 border-primary/40 shadow-xs'
                            : 'bg-card border-border/80 hover:bg-muted/40'
                        )}
                      >
                        {/* Left: Checkbox + Avatar + Info */}
                        <div className="flex items-center gap-3 min-w-0">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => {}} // Handled by parent div
                            className="h-4 w-4 rounded border-border text-primary focus:ring-primary shrink-0"
                          />

                          <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center font-bold text-[11px] text-foreground shrink-0 border border-border/70">
                            {getInitials(staff)}
                          </div>

                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-foreground text-xs truncate">
                                {displayName}
                              </span>
                              <span className="capitalize text-[10px] font-semibold px-1.5 py-0.2 rounded bg-muted/60 text-muted-foreground shrink-0 border border-border/50">
                                {staff.role || 'Staff'}
                              </span>
                            </div>
                            <p className="text-[11px] text-muted-foreground truncate">
                              {staff.email || 'No email registered'}
                            </p>
                          </div>
                        </div>

                        {/* Right: Quick Configure Directly Action */}
                        {onConfigureSingle && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              onConfigureSingle(staff);
                              onClose();
                            }}
                            className="h-7 px-2 text-[11px] font-semibold text-muted-foreground hover:text-foreground shrink-0"
                          >
                            <span>Configure Salary</span>
                            <Icon icon="solar:arrow-right-linear" className="h-3 w-3 ml-1" />
                          </Button>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </>
          )}
        </div>
      }
      footer={
        <div className="w-full flex items-center justify-between gap-3 pt-2 border-t border-border/70">
          <div className="text-xs text-muted-foreground font-medium">
            {selectedStaffIds.length > 0 && (
              <span>{selectedStaffIds.length} of {unconfiguredStaff.length} selected</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="text-xs font-semibold"
            >
              Cancel
            </Button>
            {unconfiguredStaff.length > 0 && (
              <Button
                type="button"
                size="sm"
                disabled={selectedStaffIds.length === 0 || isSubmitting}
                onClick={handleBatchImport}
                className="text-xs font-semibold gap-1.5"
              >
                {isSubmitting ? (
                  <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-background border-t-transparent" />
                ) : (
                  <Icon icon="solar:user-check-linear" className="h-4 w-4" />
                )}
                <span>
                  {selectedStaffIds.length > 0
                    ? `Import ${selectedStaffIds.length} Staff to Payroll`
                    : 'Import to Payroll'}
                </span>
              </Button>
            )}
          </div>
        </div>
      }
    />
  );
}
