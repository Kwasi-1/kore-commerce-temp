import React from 'react';

// Add new currencies here when needed — GHS is the only one in use for now.
const CURRENCIES = {
  GHS: { code: 'GHS', symbol: 'GHS', locale: 'en-GH' },
  USD: { code: 'USD', symbol: '$', locale: 'en-US' },
  GBP: { code: 'GBP', symbol: '£', locale: 'en-GB' },
} as const;

export type CurrencyCode = keyof typeof CURRENCIES;

export const useCurrency = (currency: CurrencyCode = 'GHS') => {
  const { code, locale } = CURRENCIES[currency];

  const formatWithSymbol = (amount: number) => {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: code,
    }).format(amount || 0);
  };

  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat(locale, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount || 0);
  };

  return { formatWithSymbol, formatAmount };
};

export const CurrencyDisplay = ({
  amount,
  currency = 'GHS',
  className,
  symbolClassName,
  showStyling = true,
}: {
  amount: number;
  currency?: CurrencyCode;
  className?: string;
  symbolClassName?: string;
  showStyling?: boolean;
}) => {
  const { formatAmount } = useCurrency(currency);
  const { symbol } = CURRENCIES[currency];

  const shouldApplyDefaultStyling = symbolClassName ? false : showStyling;

  return (
    <span className={className}>
      <span
        className={`${
          shouldApplyDefaultStyling ? "text-sm font-normal text-muted-foreground" : ""
        } ${symbolClassName ?? ""} mr-1`}
      >
        {symbol}
      </span>
      {formatAmount(amount)}
    </span>
  );
};