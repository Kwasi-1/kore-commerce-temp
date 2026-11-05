import { create } from 'zustand';
import { persist } from 'zustand/middleware';

/**
 * Shops and warehouses (from GET /tenant/features → locations) and the one picked in the header's
 * location switcher. The API client sends the pick as X-Location-Id, so lists, reports and stock
 * follow it; "all" sends nothing. Tills don't use the pick: the server uses the till's own location.
 */
export interface StoreLocation {
  id: string;
  name: string;
  type: 'store' | 'warehouse';
  address: string | null;
  phone: string | null;
  receiptPrefix: string | null;
  isMain: boolean;
  fulfilsOnline: boolean;
  status: 'active' | 'paused' | 'archived';
}

export interface LocationLimit {
  enabled: boolean;
  limit: number;
  included: number;
  extra: number;
  used: number;
  active: number;
}

interface LocationsPayload {
  list?: StoreLocation[];
  multi?: boolean;
  limit?: LocationLimit;
  till_location_id?: string | null;
  sees_all?: boolean;
}

interface LocationState {
  locations: StoreLocation[];
  /** More than one location in use: show the switcher and location fields */
  multi: boolean;
  /** Owners and admins see every location */
  seesAll: boolean;
  tillLocationId: string | null;
  limit: LocationLimit | null;
  /** The switcher's pick: a location id, or 'all' */
  selectedId: string;
  setFromFeatures: (payload: LocationsPayload | null | undefined) => void;
  select: (id: string) => void;
  reset: () => void;
}

const initial = {
  locations: [] as StoreLocation[],
  multi: false,
  seesAll: true,
  tillLocationId: null as string | null,
  limit: null as LocationLimit | null,
  selectedId: 'all',
};

export const useLocationStore = create<LocationState>()(
  persist(
    (set, get) => ({
      ...initial,

      setFromFeatures: (payload) => {
        if (!payload) return;
        const locations = payload.list ?? [];
        const multi = !!payload.multi;
        const seesAll = payload.sees_all ?? true;
        let selectedId = get().selectedId;
        const stillThere = selectedId === 'all' || locations.some((l) => l.id === selectedId);
        // One location, or the pick is gone: back to the default (all, or theirs if they have one)
        if (!multi || !stillThere) {
          selectedId = !seesAll && locations.length === 1 ? locations[0].id : 'all';
        }
        set({
          locations,
          multi,
          seesAll,
          tillLocationId: payload.till_location_id ?? null,
          limit: payload.limit ?? null,
          selectedId,
        });
      },

      select: (id) => set({ selectedId: id }),

      reset: () => set(initial),
    }),
    {
      name: 'kore-location',
      partialize: (s) => ({ selectedId: s.selectedId }),
    },
  ),
);

/** The picked location, or null for "All locations" */
export const selectedLocation = (): StoreLocation | null => {
  const { selectedId, locations } = useLocationStore.getState();
  return selectedId === 'all' ? null : locations.find((l) => l.id === selectedId) ?? null;
};

/** What the API client sends: the picked location's id, or nothing */
export const locationHeader = (): string | null => {
  const { multi, selectedId } = useLocationStore.getState();
  return multi && selectedId !== 'all' ? selectedId : null;
};
