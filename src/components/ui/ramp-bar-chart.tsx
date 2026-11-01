import { useState } from 'react';
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { chartTooltipStyle, compactNumber, rampStrength, shade } from '@/lib/chart';
import { cn } from '@/lib/utils';

interface Props<T> {
  data: T[];
  xKey: string;
  yKey: string;
  /** Series name in the tooltip */
  name?: string;
  /** Tooltip value, e.g. a currency formatter */
  formatValue?: (value: number) => string;
  maxBarSize?: number;
  className?: string;
}

/**
 * A single time series as neutral bars that darken toward the most recent one. The hovered bar
 * goes to full strength. Fills the height of its parent.
 */
export default function RampBarChart<T>({ data, xKey, yKey, name, formatValue, maxBarSize = 44, className }: Props<T>) {
  const [active, setActive] = useState<number | null>(null);
  const tick = { fill: 'currentColor', fillOpacity: 0.55, fontSize: 12 };

  return (
    <div className={cn('h-full w-full text-foreground', className)}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          margin={{ top: 10, right: 4, left: 0, bottom: 0 }}
          onMouseMove={(s) => setActive(s?.activeTooltipIndex != null ? Number(s.activeTooltipIndex) : null)}
          onMouseLeave={() => setActive(null)}
        >
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="currentColor" strokeOpacity={0.08} />
          <XAxis dataKey={xKey} axisLine={false} tickLine={false} tick={tick} dy={8} />
          <YAxis axisLine={false} tickLine={false} tick={tick} width={40} tickFormatter={compactNumber} />
          <Tooltip
            cursor={false}
            formatter={(value: number) => (formatValue ? formatValue(value) : value)}
            contentStyle={chartTooltipStyle}
            itemStyle={{ color: 'hsl(var(--foreground))' }}
          />
          <Bar dataKey={yKey} name={name} radius={6} maxBarSize={maxBarSize} fill="currentColor">
            {data.map((_, i) => (
              <Cell key={i} style={{ fill: shade(active === i ? 100 : rampStrength(i, data.length)), transition: 'fill 150ms' }} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
