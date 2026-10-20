import { useState } from 'react';
import { Icon } from '@iconify/react/dist/iconify.js';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { blurOnWheel, toNum } from './utils';

interface Props {
  unitName: string;
  /** Pack sizes already set up on the product, offered as quick picks. */
  packs?: { name: string; units: number }[];
  onApply: (costPerUnit: string) => void;
}

const field = 'w-full min-w-0 h-8 px-2 text-xs border border-border rounded-md bg-background focus:outline-none focus:border-foreground/40';

/** "I buy it as a crate of 24 for GHS 120" → fills in the cost per unit. */
export default function BulkCostHelper({ unitName, packs = [], onApply }: Props) {
  const unit = unitName || 'unit';
  const [open, setOpen] = useState(false);
  const [units, setUnits] = useState(packs[0] ? String(packs[0].units) : '');
  const [price, setPrice] = useState('');
  const u = toNum(units);
  const p = toNum(price);
  const perUnit = u && u > 0 && p !== null && p >= 0 ? p / u : null;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button type="button" className="inline-flex items-center gap-1 text-[11px] font-medium text-muted-foreground hover:text-foreground">
          <Icon icon="lucide:calculator" className="text-[12px]" /> Bought in bulk?
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-72 p-3 space-y-3 bg-card text-card-foreground border-border">
        <p className="text-xs font-semibold">Work out the cost per {unit}</p>
        {packs.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {packs.map((pk) => (
              <button
                key={pk.name}
                type="button"
                onClick={() => setUnits(String(pk.units))}
                className="h-6 px-2 rounded-md border border-border text-[11px] hover:bg-muted"
              >
                {pk.name} of {pk.units}
              </button>
            ))}
          </div>
        )}
        <div className="grid grid-cols-2 gap-2">
          <label>
            <span className="block text-[11px] text-muted-foreground mb-1">{unit}s in the pack</span>
            <input type="number" inputMode="numeric" min={1} className={field} placeholder="e.g. 24" value={units} onWheel={blurOnWheel} onChange={(e) => setUnits(e.target.value)} />
          </label>
          <label>
            <span className="block text-[11px] text-muted-foreground mb-1">Pack cost (GHS)</span>
            <input type="number" inputMode="decimal" min={0} step="any" className={field} placeholder="e.g. 120" value={price} onWheel={blurOnWheel} onChange={(e) => setPrice(e.target.value)} />
          </label>
        </div>
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs tabular-nums">{perUnit !== null ? `= GHS ${perUnit.toFixed(2)} per ${unit}` : ' '}</span>
          <button
            type="button"
            disabled={perUnit === null}
            onClick={() => {
              onApply(String(Math.round((perUnit as number) * 10000) / 10000));
              setOpen(false);
            }}
            className="h-7 px-3 rounded-md bg-primary text-primary-foreground text-xs font-semibold disabled:opacity-40"
          >
            Use
          </button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
