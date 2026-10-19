import { cn } from '@/lib/utils';
import { blurOnWheel, marginInfo } from './utils';

interface Props {
  id?: string;
  value: string;
  onChange: (v: string) => void;
  cost?: string;
  units?: string | number;
  error?: string;
  placeholder?: string;
  className?: string;
  /** Show the margin / below-cost hint under the field. */
  showMargin?: boolean;
  size?: 'sm' | 'md';
  ariaLabel?: string;
}

/** Money input; warns inline only when the price is below cost (margin shown as a tooltip). */
export default function PriceInput({
  id,
  value,
  onChange,
  cost,
  units = 1,
  error,
  placeholder = 'Required',
  className,
  showMargin = true,
  size = 'sm',
  ariaLabel,
}: Props) {
  const margin = showMargin && cost ? marginInfo(value, cost, units) : null;
  return (
    <div className={cn('min-w-0', className)}>
      <div className="relative">
        <span className={cn('absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none', size === 'md' ? 'text-sm' : 'text-[11px]')}>
          GHS
        </span>
        <input
          id={id}
          type="number"
          inputMode="decimal"
          step="any"
          min="0"
          aria-label={ariaLabel}
          aria-invalid={!!error}
          placeholder={placeholder}
          title={margin && !margin.below ? `${margin.pct.toFixed(0)}% margin` : undefined}
          value={value}
          onWheel={blurOnWheel}
          onChange={(e) => onChange(e.target.value)}
          className={cn(
            'w-full rounded-lg border bg-card text-foreground font-semibold tabular-nums focus:outline-none transition-colors',
            size === 'md' ? 'h-[3.5rem] pl-12 pr-3 text-sm' : 'h-8 pl-10 pr-2 text-xs',
            error
              ? 'border-destructive bg-destructive/5 focus:border-destructive'
              : margin?.below
                ? 'border-amber-500 bg-amber-500/5'
                : 'border-border focus:border-foreground/40',
          )}
        />
      </div>
      {/* Only speak up when something is wrong; the healthy margin lives in the tooltip */}
      {error ? (
        <span className="mt-0.5 block text-[10px] font-semibold text-destructive leading-tight">{error}</span>
      ) : margin?.below ? (
        <span className="mt-0.5 block text-[10px] font-semibold leading-tight text-amber-600 dark:text-amber-400">Below cost</span>
      ) : null}
    </div>
  );
}
