import { useState } from 'react';
import toast from 'react-hot-toast';
import CustomModal from '@/components/modals/modal';
import { Button } from '@/components/ui/button';
import { CurrencyDisplay } from '@/hooks';
import { cn } from '@/lib/utils';
import { lineDiscountAmount, lineTotal, type CartItem } from '@/store/cartStore';

interface Props {
  item: CartItem;
  /** "Change prices at the till" is available (Business plan or add-on, and switched on) */
  canRaise: boolean;
  /** Discounts are switched on in POS settings */
  canDiscount: boolean;
  onSetPrice: (unitPrice: number) => void;
  onSetDiscount: (discount: { type: 'percent' | 'amount'; value: number } | null) => void;
  className?: string;
}

const money = (raw: string) => {
  const t = raw.replace(/[^\d.]/g, '');
  const dot = t.indexOf('.');
  return dot === -1 ? t.slice(0, 7) : t.slice(0, dot).slice(0, 7) + '.' + t.slice(dot + 1).replace(/\./g, '').slice(0, 2);
};

/**
 * A cart line's total. Tapping it opens a small editor with a Discount tab (a % or an amount off this
 * line) and a Change price tab (raise the price each; never below the set price), each shown only
 * when the store allows it. A line is either discounted or price-raised, not both.
 */
export default function LinePriceEditor({ item, canRaise, canDiscount, onSetPrice, onSetDiscount, className }: Props) {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<'discount' | 'price'>('discount');
  const [mode, setMode] = useState<'percent' | 'amount'>('percent');
  const [text, setText] = useState('');
  const listPrice = item.list_price ?? item.price;
  const gross = Math.round(item.price * item.quantity * 100) / 100;
  const off = lineDiscountAmount(item);
  const raised = !!item.price_overridden;

  const openEditor = () => {
    const startTab = item.line_discount_type || !canRaise ? 'discount' : raised || !canDiscount ? 'price' : 'discount';
    setTab(startTab);
    setMode(item.line_discount_type || 'percent');
    setText(
      startTab === 'price'
        ? item.price.toFixed(2)
        : item.line_discount_value
        ? String(item.line_discount_value)
        : '',
    );
    setOpen(true);
  };

  const switchTab = (next: 'discount' | 'price') => {
    setTab(next);
    setText(next === 'price' ? item.price.toFixed(2) : item.line_discount_value ? String(item.line_discount_value) : '');
  };

  const value = parseFloat(text);
  const listGross = Math.round(listPrice * item.quantity * 100) / 100;
  const preview = tab === 'discount'
    ? (isNaN(value) ? listGross : Math.max(0, listGross - (mode === 'percent' ? Math.round(listGross * Math.min(value, 100)) / 100 : value)))
    : (isNaN(value) ? gross : Math.round(value * item.quantity * 100) / 100);

  const apply = () => {
    if (tab === 'discount') {
      if (isNaN(value) || value <= 0) {
        toast.error('Enter a discount');
        return;
      }
      if (mode === 'percent' && value > 100) {
        toast.error("A discount can't be more than 100%");
        return;
      }
      if (mode === 'amount' && value > listGross) {
        toast.error(`The discount can't be more than ${listGross.toFixed(2)}`);
        return;
      }
      onSetDiscount({ type: mode, value });
    } else {
      if (isNaN(value)) return;
      if (value < listPrice - 0.0001) {
        toast.error(`Can't go below ${listPrice.toFixed(2)}. Use a discount instead.`);
        return;
      }
      onSetPrice(Math.round(value * 100) / 100);
    }
    setOpen(false);
  };

  const total = <CurrencyDisplay amount={lineTotal(item)} />;
  const note = off > 0 ? (
    <span className="block text-[10px] font-medium text-emerald-600 dark:text-emerald-400 leading-tight">
      {gross.toFixed(2)} − {item.line_discount_type === 'percent' ? `${item.line_discount_value}%` : off.toFixed(2)}
      {item.discount_approved_by && <span className="block text-muted-foreground">Approved by {item.discount_approved_by}</span>}
    </span>
  ) : raised ? (
    <span className="block text-[10px] font-medium text-amber-600 dark:text-amber-400 leading-tight">
      {item.price.toFixed(2)} each (was {listPrice.toFixed(2)})
      {item.approved_by && <span className="block text-muted-foreground">Approved by {item.approved_by}</span>}
    </span>
  ) : null;

  if (!canRaise && !canDiscount) {
    return <span className={cn('text-right', className)}>{total}{note}</span>;
  }

  return (
    <>
      <button
        type="button"
        onClick={openEditor}
        title={canDiscount && canRaise ? 'Discount or change the price' : canDiscount ? 'Discount this item' : "Change the price (can't go below the set price)"}
        className={cn('text-right rounded-md hover:bg-muted/60 px-1 -mx-1 transition-colors', className)}
      >
        {total}
        {note}
      </button>

      <CustomModal
        isOpen={open}
        onOpenChange={() => setOpen(false)}
        size="sm"
        header={
          <div className="pt-2 px-1 border-b border-border/50 pb-3">
            <h3 className="text-lg font-bold text-foreground truncate">{item.name}</h3>
            <p className="text-[12px] font-normal text-muted-foreground mt-0.5">
              {item.quantity} × {listPrice.toFixed(2)} {item.tier_name ? `(${item.tier_name})` : ''}
            </p>
          </div>
        }
        body={
          <div className="py-3 space-y-3">
            {canDiscount && canRaise && (
              <div className="flex p-1 bg-secondary/50 rounded-full border border-border/50">
                {(['discount', 'price'] as const).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => switchTab(t)}
                    className={cn(
                      'flex-1 py-2 rounded-full text-xs font-bold transition-all',
                      tab === t ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground',
                    )}
                  >
                    {t === 'discount' ? 'Discount' : 'Change price'}
                  </button>
                ))}
              </div>
            )}

            {tab === 'discount' ? (
              <div className="space-y-2">
                <div className="flex gap-1.5">
                  {(['percent', 'amount'] as const).map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => {
                        setMode(m);
                        setText('');
                      }}
                      className={cn(
                        'h-8 px-3 rounded-full border text-xs font-semibold',
                        mode === m ? 'border-foreground bg-foreground text-background' : 'border-border hover:bg-muted',
                      )}
                    >
                      {m === 'percent' ? '% off' : 'GHS off'}
                    </button>
                  ))}
                </div>
                <label className="flex items-center gap-2 rounded-lg border border-border bg-background px-3 h-11 cursor-text">
                  <span className="text-xs font-semibold text-muted-foreground">{mode === 'percent' ? '%' : 'GHS'}</span>
                  <input
                    autoFocus
                    inputMode="decimal"
                    value={text}
                    onChange={(e) => setText(money(e.target.value))}
                    onKeyDown={(e) => e.key === 'Enter' && apply()}
                    placeholder={mode === 'percent' ? 'e.g. 10' : '0.00'}
                    aria-label={mode === 'percent' ? 'Discount percent' : 'Discount amount'}
                    className="w-full bg-transparent text-base font-bold tabular-nums focus:outline-none"
                  />
                </label>
                <p className="text-[11px] text-muted-foreground">Comes off this line only. A whole-sale discount can still be added.</p>
              </div>
            ) : (
              <div className="space-y-2">
                <label className="flex items-center gap-2 rounded-lg border border-border bg-background px-3 h-11 cursor-text">
                  <span className="text-xs font-semibold text-muted-foreground">GHS</span>
                  <input
                    autoFocus
                    inputMode="decimal"
                    value={text}
                    onChange={(e) => setText(money(e.target.value))}
                    onKeyDown={(e) => e.key === 'Enter' && apply()}
                    aria-label="Price each"
                    className="w-full bg-transparent text-base font-bold tabular-nums focus:outline-none"
                  />
                  <span className="text-[11px] text-muted-foreground">each</span>
                </label>
                <p className="text-[11px] text-muted-foreground">
                  Can&apos;t go below the set price ({listPrice.toFixed(2)}). For less, use a discount.
                </p>
              </div>
            )}

            <div className="flex items-center justify-between rounded-lg bg-muted/60 px-3 py-2.5">
              <span className="text-xs font-semibold text-muted-foreground">Line total</span>
              <span className="text-lg font-bold tabular-nums"><CurrencyDisplay amount={preview} /></span>
            </div>
          </div>
        }
        footer={
          <div className="flex items-center justify-between gap-2 w-full pt-2 border-t border-border/50">
            {off > 0 || raised ? (
              <Button
                variant="ghost"
                className="rounded-full font-semibold text-destructive hover:text-destructive"
                onClick={() => {
                  if (off > 0) onSetDiscount(null);
                  if (raised) onSetPrice(listPrice);
                  setOpen(false);
                }}
              >
                {off > 0 ? 'Remove discount' : 'Back to set price'}
              </Button>
            ) : (
              <span />
            )}
            <Button className="rounded-full font-semibold px-6" onClick={apply}>
              Apply
            </Button>
          </div>
        }
      />
    </>
  );
}
