import { CurrencyDisplay } from '@/hooks';
import { CashCount, DENOMINATIONS, cashCountTotal } from '@/utils/cashCount';

interface Props {
  value: CashCount;
  onChange: (next: CashCount) => void;
}

/** Count the drawer by notes and coins: how many of each, and the app adds them up. */
export default function CashCountInput({ value, onChange }: Props) {
  const set = (key: string, raw: string) => onChange({ ...value, [key]: raw });
  const total = cashCountTotal(value);

  return (
    <div className="space-y-3 !font-sans">
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {DENOMINATIONS.map((d) => {
          const n = parseInt(value[d.key] || '0', 10) || 0;
          return (
            <label key={d.key} className="flex items-center gap-2 rounded-lg border border-border bg-background px-2.5 py-1.5">
              <span className="text-xs font-bold w-10 shrink-0">{d.value >= 1 ? `₵${d.label}` : d.label}</span>
              <span className="text-[11px] text-muted-foreground">×</span>
              <input
                type="number"
                inputMode="numeric"
                min={0}
                step={1}
                placeholder="0"
                value={value[d.key] || ''}
                onChange={(e) => set(d.key, e.target.value.replace(/[^\d]/g, ''))}
                onWheel={(e) => (e.target as HTMLInputElement).blur()}
                aria-label={`Number of GHS ${d.label}`}
                className="w-full min-w-0 bg-transparent text-sm font-bold tabular-nums focus:outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none"
              />
              {n > 0 && <span className="text-[10px] text-muted-foreground tabular-nums shrink-0">{(n * d.value).toFixed(d.value < 1 ? 2 : 0)}</span>}
            </label>
          );
        })}
        <label className="flex items-center gap-2 rounded-lg border border-border bg-background px-2.5 py-1.5 col-span-2 sm:col-span-1">
          <span className="text-xs font-bold shrink-0">Other</span>
          <input
            type="number"
            inputMode="decimal"
            min={0}
            step="0.01"
            placeholder="0.00"
            value={value.other || ''}
            onChange={(e) => set('other', e.target.value)}
            onWheel={(e) => (e.target as HTMLInputElement).blur()}
            aria-label="Other amount (GHS)"
            className="w-full min-w-0 bg-transparent text-sm font-bold tabular-nums focus:outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none"
          />
        </label>
      </div>
      <div className="flex items-center justify-between rounded-lg bg-muted/50 px-3 py-2">
        <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Total counted</span>
        <span className="text-lg font-black tabular-nums"><CurrencyDisplay amount={total} /></span>
      </div>
    </div>
  );
}
