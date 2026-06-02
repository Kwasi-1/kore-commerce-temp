import React from 'react';

export const useCurrency = () => {
  const formatGHS = (amount: number) => {
    return new Intl.NumberFormat('en-GH', {
      style: 'currency',
      currency: 'GHS',
    }).format(amount || 0);
  };

  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('en-GH', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount || 0);
  };

  return { formatGHS, formatAmount };
};

export const CurrencyDisplay = ({ amount, className }: { amount: number, className?: string }) => {
  const { formatAmount } = useCurrency();
  return (
    <span className={className}>
      <span className="text-sm font-normal text-muted-foreground mr-1">GHS</span>
      {formatAmount(amount)}
    </span>
  );
};
