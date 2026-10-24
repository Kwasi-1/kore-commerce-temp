import { useState } from 'react';
import toast from 'react-hot-toast';
import { CurrencyDisplay } from '@/hooks';
import { cn } from '@/lib/utils';
import type { CartItem } from '@/store/cartStore';

interface Props {
  item: CartItem;
  /** "Change prices at the till" is on and this person may use it */
  canEdit: boolean;
  onSetPrice: (unitPrice: number) => void;
  className?: string;
}

/**
 * A cart line's total. Where price changes are allowed, tapping it edits the price each: it can go
 * up from the item's set price but not below it (a lower price is a discount).
 */
export default function LinePriceEditor({ item, canEdit, onSetPrice, className }: Props) {
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState('');
  const listPrice = item.list_price ?? item.price;
  const raised = !!item.price_overridden;

  const commit = () => {
    setEditing(false);
    const value = parseFloat(text);
    if (isNaN(value) || Math.abs(value - item.price) < 0.0001) return;
    if (value < listPrice - 0.0001) {
      toast.error(`Can't go below ${listPrice.toFixed(2)}. Use a discount instead.`);
      return;
    }
    onSetPrice(Math.round(value * 100) / 100);
  };

  if (editing) {
    return (
      <span className={cn('inline-flex items-center gap-1', className)}>
        <input
          autoFocus
          type="text"
          inputMode="decimal"
          value={text}
          onChange={(e) => setText(e.target.value.replace(/[^\d.]/g, ''))}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
            if (e.key === 'Escape') setEditing(false);
          }}
          aria-label={`Price each for ${item.name}`}
          className="w-20 h-7 px-2 text-right text-sm font-bold tabular-nums rounded-md border border-foreground/30 bg-background focus:outline-none"
        />
        <span className="text-[10px] text-muted-foreground">each</span>
      </span>
    );
  }

  const total = <CurrencyDisplay amount={item.price * item.quantity} />;
  if (!canEdit) return <span className={className}>{total}</span>;
  return (
    <button
      type="button"
      onClick={() => {
        setText(item.price.toFixed(2));
        setEditing(true);
      }}
      title="Change the price (can't go below the set price)"
      className={cn('text-right rounded-md hover:bg-muted/60 px-1 -mx-1 transition-colors', className)}
    >
      {total}
      {raised && (
        <span className="block text-[10px] font-medium text-amber-600 dark:text-amber-400 leading-tight">
          {item.price.toFixed(2)} each (was {listPrice.toFixed(2)})
        </span>
      )}
    </button>
  );
}
