import React from 'react';
import { formatQty, getTierBreakdown, PackagingTier } from '@/utils/packaging';

export interface PackagingStockDisplayProps {
  quantity: number | string | null | undefined;
  baseUnitName?: string;
  packagingTiers?: PackagingTier[];
  className?: string;
  primaryClassName?: string;
  tierClassName?: string;
  showPrefixSign?: boolean;
  prefix?: string;
  icon?: React.ReactNode;
  statusColor?: 'auto' | 'none';
  customBreakdown?: string | null;
}

export function PackagingStockDisplay({
  quantity,
  baseUnitName = 'units',
  packagingTiers,
  className = '',
  primaryClassName,
  tierClassName = 'text-[11px] text-muted-foreground font-medium',
  showPrefixSign = false,
  prefix,
  icon,
  statusColor = 'none',
  customBreakdown,
}: PackagingStockDisplayProps) {
  const numQty = typeof quantity === 'number' ? quantity : parseFloat(String(quantity ?? 0));
  const isNaNQty = isNaN(numQty);
  const safeQty = isNaNQty ? 0 : numQty;

  const tierText =
    customBreakdown !== undefined
      ? customBreakdown
      : getTierBreakdown(safeQty, baseUnitName, packagingTiers);

  const signPrefix = prefix ?? (showPrefixSign && safeQty > 0 ? '+' : '');

  const isOutOfStock = safeQty <= 0;
  const isLowStock = safeQty > 0 && safeQty <= 5;

  let defaultColorClass = 'text-foreground';
  if (statusColor === 'auto') {
    if (isOutOfStock) defaultColorClass = 'text-destructive font-bold';
    else if (isLowStock) defaultColorClass = 'text-amber-500 font-semibold';
    else defaultColorClass = 'text-foreground font-medium';
  }

  const finalPrimaryClass = primaryClassName ?? `text-sm font-bold ${defaultColorClass}`;

  return (
    <div className={`flex flex-col leading-tight ${className}`}>
      <span className={`inline-flex items-center gap-1.5 ${finalPrimaryClass}`}>
        {icon}
        {signPrefix}{formatQty(safeQty)} {baseUnitName}
      </span>
      {tierText && (
        <span className={tierClassName}>
          ({tierText})
        </span>
      )}
    </div>
  );
}

export default PackagingStockDisplay;
