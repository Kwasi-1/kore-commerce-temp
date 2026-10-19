import { cn } from '@/lib/utils';
import type { SellMode } from './types';

// eslint-disable-next-line react-refresh/only-export-components
export const SELL_MODES: { key: SellMode; label: string; help: string }[] = [
  { key: 'unit_only', label: 'Single units', help: 'Sold one at a time' },
  { key: 'pack_only', label: 'Packs only', help: 'Only sold in packs' },
  { key: 'flexible', label: 'Units or packs', help: 'Cashier picks at the till' },
];

export default function SellModePicker({ value, onChange }: { value: SellMode; onChange: (m: SellMode) => void }) {
  return (
    <div className="grid grid-cols-3 gap-1.5">
      {SELL_MODES.map((m) => (
        <button
          key={m.key}
          type="button"
          onClick={() => onChange(m.key)}
          className={cn(
            'rounded-lg border px-2 py-1.5 text-left transition-colors',
            value === m.key ? 'border-primary bg-primary/10' : 'border-border bg-card hover:bg-muted',
          )}
        >
          <span className="block text-xs font-semibold">{m.label}</span>
          <span className="block text-[10px] text-muted-foreground leading-tight">{m.help}</span>
        </button>
      ))}
    </div>
  );
}
