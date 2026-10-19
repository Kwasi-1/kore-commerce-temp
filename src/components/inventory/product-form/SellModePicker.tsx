import { cn } from '@/lib/utils';
import type { SellMode } from './types';

// eslint-disable-next-line react-refresh/only-export-components
export const SELL_MODES: { key: SellMode; label: string; help: string }[] = [
  { key: 'unit_only', label: 'Units', help: 'Sold one at a time' },
  { key: 'pack_only', label: 'Packs only', help: 'Only sold in packs' },
  { key: 'flexible', label: 'Units or packs', help: 'Cashier picks at the till' },
];

/** Compact segmented control; the explanation is in each option's tooltip. */
export default function SellModePicker({ value, onChange }: { value: SellMode; onChange: (m: SellMode) => void }) {
  return (
    <div className="inline-flex rounded-lg border border-border bg-muted/40 p-0.5" role="radiogroup" aria-label="How it's sold">
      {SELL_MODES.map((m) => (
        <button
          key={m.key}
          type="button"
          role="radio"
          aria-checked={value === m.key}
          title={m.help}
          onClick={() => onChange(m.key)}
          className={cn(
            'h-7 px-3 rounded-md text-xs font-medium transition-colors whitespace-nowrap',
            value === m.key ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground',
          )}
        >
          {m.label}
        </button>
      ))}
    </div>
  );
}
