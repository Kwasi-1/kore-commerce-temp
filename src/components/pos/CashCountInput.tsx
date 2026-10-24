import { CurrencyDisplay } from '@/hooks';
import { cn } from '@/lib/utils';
import { CashCount, DENOMINATIONS, MAX_COUNT_DIGITS, cashCountTotal, cleanOtherAmount } from '@/utils/cashCount';

interface Props {
  value: CashCount;
  onChange: (next: CashCount) => void;
}

// ₵2 and ₵1 come as notes and coins, so they sit with the coins
const bigNotes = DENOMINATIONS.filter((d) => d.value >= 5);
const smallCash = DENOMINATIONS.filter((d) => d.value < 5);

/** Count the drawer by notes and coins: how many of each, and the app adds them up. */
export default function CashCountInput({ value, onChange }: Props) {
  const set = (key: string, raw: string) => onChange({ ...value, [key]: raw });
  const total = cashCountTotal(value);

  const tile = (d: (typeof DENOMINATIONS)[number]) => {
    const n = parseInt(value[d.key] || '0', 10) || 0;
    const label = d.value >= 1 ? `₵${d.label}` : d.label;
    return (
      <label
        key={d.key}
        className={cn(
          'rounded-lg border px-2.5 pt-1.5 pb-1 cursor-text transition-colors min-w-0 !font-sans',
          n > 0 ? 'border-foreground/25 bg-muted/40' : 'border-border bg-background hover:border-foreground/20',
        )}
      >
        <span className="flex items-baseline justify-between gap-1">
          <span className="text-[11px] font-semibold text-foreground">{label}</span>
          {n > 0 && <span className="text-[10px] text-muted-foreground tabular-nums truncate">{(n * d.value).toFixed(2)}</span>}
        </span>
        <input
          type="text"
          inputMode="numeric"
          maxLength={MAX_COUNT_DIGITS}
          placeholder="0"
          value={value[d.key] || ''}
          onChange={(e) => set(d.key, e.target.value.replace(/[^\d]/g, '').slice(0, MAX_COUNT_DIGITS))}
          aria-label={`How many ${label}`}
          className="w-full bg-transparent text-base font-bold tabular-nums focus:outline-none placeholder:text-muted-foreground/40"
        />
      </label>
    );
  };

  return (
    <div className="space-y-3 !font-sans">
      <div className="space-y-1.5">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Notes</p>
        <div className="grid grid-cols-3 gap-1.5">{bigNotes.map(tile)}</div>
      </div>
      <div className="space-y-1.5">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">₵2, ₵1 &amp; coins</p>
        <div className="grid grid-cols-3 gap-1.5">{smallCash.map(tile)}</div>
      </div>
      <label className="flex items-center justify-between gap-3 rounded-lg border border-border bg-background px-2.5 py-2 cursor-text">
        <span className="text-[11px] font-semibold text-foreground shrink-0">Other amount</span>
        <input
          type="text"
          inputMode="decimal"
          placeholder="0.00"
          value={value.other || ''}
          onChange={(e) => set('other', cleanOtherAmount(e.target.value))}
          aria-label="Other amount (GHS)"
          className="w-28 text-right bg-transparent text-sm font-bold tabular-nums focus:outline-none placeholder:text-muted-foreground/40"
        />
      </label>
      <div className="flex items-center justify-between gap-3 rounded-lg bg-muted/60 px-3 py-2.5">
        <span className="text-xs font-semibold text-muted-foreground shrink-0 !font-header">Total counted</span>
        <span className="text-lg font-bold tabular-nums truncate"><CurrencyDisplay amount={total} /></span>
      </div>
    </div>
  );
}
