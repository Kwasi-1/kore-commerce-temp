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

export const CurrencyDisplay = ({
  amount,
  className,
  symbolClassName,
  showStyling = true,
}: {
  amount: number;
  className?: string;
  symbolClassName?: string;
  showStyling?: boolean;
}) => {
  const { formatAmount } = useCurrency();

  const shouldApplyDefaultStyling = symbolClassName ? false : showStyling;

  return (
    <span className={className}>
      <span
        className={`${
          shouldApplyDefaultStyling ? "text-sm font-normal text-muted-foreground" : ""
        } ${symbolClassName ?? ""} mr-1`}
      >
        GHS
      </span>
      {formatAmount(amount)}
    </span>
  );
};