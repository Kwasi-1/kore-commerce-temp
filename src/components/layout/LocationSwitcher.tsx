import { Icon } from '@iconify/react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { useLocationStore } from '@/store/locationStore';

interface Props {
  className?: string;
}

/**
 * Header pick between "All locations" and one shop or warehouse. Hidden with a single location.
 * Pages follow it through the X-Location-Id header (and remount on change, see DashboardLayout).
 */
export default function LocationSwitcher({ className }: Props) {
  const { locations, multi, selectedId, select } = useLocationStore();
  if (!multi || locations.length === 0) return null;

  const current = locations.find((l) => l.id === selectedId);
  const label = current ? current.name : 'All locations';
  const icon = current?.type === 'warehouse' ? 'solar:box-linear' : current ? 'solar:shop-2-linear' : 'solar:buildings-2-linear';

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className={cn(
            'flex items-center gap-1.5 h-8 pd:h-9 md:h-10 px-3 rounded-full text-sm font-medium text-foreground hover:bg-muted transition-colors max-w-[180px]',
            className,
          )}
          title="Choose a location"
        >
          <Icon icon={icon} className="h-4 w-4 shrink-0 text-muted-foreground" />
          <span className="truncate">{label}</span>
          <Icon icon="mdi:chevron-down" className="h-4 w-4 shrink-0 text-muted-foreground" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-60 rounded-[16px] shadow-md border-border/60">
        <DropdownMenuLabel className="text-xs text-muted-foreground font-medium">Location</DropdownMenuLabel>
        <DropdownMenuItem
          className="cursor-pointer gap-2 py-2.5 rounded-xl"
          onClick={() => select('all')}
        >
          <Icon icon="solar:buildings-2-linear" className="h-4 w-4 text-muted-foreground" />
          <span className="flex-1">All locations</span>
          {selectedId === 'all' && <Icon icon="mdi:check" className="h-4 w-4" />}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        {locations.map((loc) => (
          <DropdownMenuItem
            key={loc.id}
            className="cursor-pointer gap-2 py-2.5 rounded-xl"
            onClick={() => select(loc.id)}
          >
            <Icon
              icon={loc.type === 'warehouse' ? 'solar:box-linear' : 'solar:shop-2-linear'}
              className="h-4 w-4 text-muted-foreground"
            />
            <span className="flex-1 min-w-0 truncate">{loc.name}</span>
            {loc.status === 'paused' && <span className="text-[10px] text-amber-600 font-semibold">Paused</span>}
            {selectedId === loc.id && <Icon icon="mdi:check" className="h-4 w-4" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
