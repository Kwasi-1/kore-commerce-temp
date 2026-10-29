import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface CartItem {
  productId: string;
  name: string;
  sku: string;
  price: number;
  quantity: number;
  imageUrl?: string;
  category?: string;
  stock_quantity?: number;
  variant_id: string;
  packaging_tier_id: string;
  tier_name: string;
  units_per_tier: number;
  unit_price: number;
  price_type: 'retail' | 'wholesale';
  packaging_tiers?: any[];
  /** The item's set price for this pack size and price type */
  list_price?: number;
  /** The cashier raised the price above list_price ("Change prices at the till") */
  price_overridden?: boolean;
  /** A manager's approval for the raised price, when the cashier doesn't have the permission */
  approval_ticket?: string;
  approved_by?: string;
  /** A discount on just this line: a % of the line, or an amount off the whole line */
  line_discount_type?: 'percent' | 'amount';
  line_discount_value?: number;
  /** A manager's approval for the line discount, when the cashier doesn't have the permission */
  discount_ticket?: string;
  discount_approved_by?: string;
}

// Money is rounded to pesewas the same way the server does (each line, then the sum). Without it
// 1.10 x 3 = 3.3000000000000003 and an exact GHS 3.30 cash payment is refused as "less than total".
const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

/** What a line's own discount takes off (a % follows the quantity), never more than the line. */
export const lineDiscountAmount = (item: CartItem): number => {
  const gross = round2(item.price * item.quantity);
  const value = item.line_discount_value || 0;
  if (!item.line_discount_type || value <= 0) return 0;
  const off = item.line_discount_type === 'percent' ? round2((gross * value) / 100) : round2(value);
  return Math.min(off, gross);
};

/** A line's total after its own discount. */
export const lineTotal = (item: CartItem): number => round2(round2(item.price * item.quantity) - lineDiscountAmount(item));

// Changing the pack size, price type or price clears a line's discount (and its approval)
const NO_LINE_DISCOUNT = {
  line_discount_type: undefined, line_discount_value: undefined, discount_ticket: undefined, discount_approved_by: undefined,
} as const;


export interface SavedTransaction {
  id: string;
  customerName: string;
  customerInitials: string;
  itemCount: number;
  time: string;
  items: CartItem[];
  discount: number;
  savedAt: string;
}

interface CartState {
  items: CartItem[];
  discount: number;
  /** A manager's approval for the discount, when the cashier doesn't have the permission */
  discountApproval: { ticket: string; approvedBy: string } | null;
  subtotal: number;
  total: number;
  savedTransactions: SavedTransaction[];
  panelState: 'collapsed' | 'default' | 'expanded';
  tenantId: string | null;

  // Actions
  syncTenant: (tenantId: string | null) => void;
  addItem: (item: Omit<CartItem, 'quantity'> & { quantity?: number }) => void;
  removeItem: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  updateItemTier: (productId: string, newTier: { id: string; name: string; units_per_tier: number; price: number }) => void;
  updateItemPriceType: (productId: string, priceType: 'retail' | 'wholesale', newPrice: number) => void;
  /** Raise a line's price each (never below its set price; lower prices are discounts) */
  setItemPrice: (productId: string, unitPrice: number, approval?: { ticket: string; approvedBy: string }) => void;
  setDiscountApproval: (approval: { ticket: string; approvedBy: string } | null) => void;
  /** Discount one line (null removes it). A discounted line goes back to its set price. */
  setLineDiscount: (
    productId: string,
    discount: { type: 'percent' | 'amount'; value: number } | null,
    approval?: { ticket: string; approvedBy: string },
  ) => void;
  setDiscount: (discount: number) => void;
  clearCart: () => void;
  /** Put these lines in the cart in place of what's there (restoring a sale) */
  replaceItems: (items: CartItem[]) => void;

  // Saved Transactions Actions
  saveTransaction: (customerName: string) => void;
  resumeTransaction: (transactionId: string) => void;
  deleteSavedTransaction: (transactionId: string) => void;
  clearAllSavedTransactions: () => void;

  // UI State Actions
  setPanelState: (state: 'collapsed' | 'default' | 'expanded') => void;
}

const calculateTotals = (items: CartItem[], discount: number) => {
  const subtotal = round2(items.reduce((sum, item) => sum + lineTotal(item), 0));
  const total = round2(Math.max(0, subtotal - (discount || 0)));
  return { subtotal, total };
};

const filterExpiredTransactions = (transactions: SavedTransaction[]): SavedTransaction[] => {
  const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000;
  const now = Date.now();
  return (transactions || []).filter(t => {
    if (!t.savedAt) return true;
    const savedTime = new Date(t.savedAt).getTime();
    if (isNaN(savedTime)) return true;
    return (now - savedTime) < TWENTY_FOUR_HOURS_MS;
  });
};

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      tenantId: null,
      items: [],
      discount: 0,
      discountApproval: null,
      subtotal: 0,
      total: 0,
      savedTransactions: [],
      panelState: 'default',

      syncTenant: (tenantId) =>
        set((state) => {
          if (tenantId && state.tenantId && state.tenantId !== tenantId) {
            return {
              tenantId,
              items: [],
              discount: 0,
              subtotal: 0,
              total: 0,
              savedTransactions: [],
            };
          }
          return { tenantId: tenantId || state.tenantId };
        }),

      setPanelState: (panelState) => set({ panelState }),

      addItem: (newItem) =>
        set((state) => {
          const existingItem = state.items.find((i) => i.productId === newItem.productId);
          let newItems;

          if (existingItem) {
            newItems = state.items.map((i) =>
              i.productId === newItem.productId
                ? { ...i, quantity: i.quantity + (newItem.quantity || 1) }
                : i
            );
          } else {
            newItems = [...state.items, {
              ...newItem,
              quantity: newItem.quantity || 1,
              list_price: newItem.list_price ?? newItem.price,
              price_overridden: false,
            }];
          }

          const totals = calculateTotals(newItems, state.discount);
          return { items: newItems, ...totals };
        }),

      removeItem: (productId) =>
        set((state) => {
          const newItems = state.items.filter((i) => i.productId !== productId);
          const totals = calculateTotals(newItems, state.discount);
          return { items: newItems, ...totals };
        }),

      updateQuantity: (productId, quantity) =>
        set((state) => {
          if (quantity <= 0) {
            const newItems = state.items.filter((i) => i.productId !== productId);
            const totals = calculateTotals(newItems, state.discount);
            return { items: newItems, ...totals };
          }

          const newItems = state.items.map((item) =>
            item.productId === productId ? { ...item, quantity } : item
          );
          const totals = calculateTotals(newItems, state.discount);
          return { items: newItems, ...totals };
        }),

      updateItemTier: (productId, newTier) =>
        set((state) => {
          const current = state.items.find((i) => i.productId === productId);
          if (!current) return state;
          const newProductId = `${current.variant_id}-${newTier.id}`;
          if (newProductId === productId) return state;
          // Already a line in that pack size: add this line's quantity to it instead of making a
          // second line with the same key (which removed/edited both together)
          if (state.items.some((i) => i.productId === newProductId)) {
            const merged = state.items
              .filter((i) => i.productId !== productId)
              .map((i) => (i.productId === newProductId ? { ...i, ...NO_LINE_DISCOUNT, quantity: Math.round((i.quantity + current.quantity) * 1000) / 1000 } : i));
            return { items: merged, ...calculateTotals(merged, state.discount) };
          }
          const newItems = state.items.map((item) => {
            if (item.productId === productId) {
              return {
                ...item,
                productId: newProductId,
                packaging_tier_id: newTier.id,
                tier_name: newTier.name,
                units_per_tier: newTier.units_per_tier,
                unit_price: newTier.price,
                price: newTier.price,
                list_price: newTier.price,
                price_overridden: false,
                approval_ticket: undefined,
                approved_by: undefined,
                ...NO_LINE_DISCOUNT,
              };
            }
            return item;
          });
          const totals = calculateTotals(newItems, state.discount);
          return { items: newItems, ...totals };
        }),

      updateItemPriceType: (productId, priceType, newPrice) =>
        set((state) => {
          const newItems = state.items.map((item) => {
            if (item.productId === productId) {
              return {
                ...item,
                price_type: priceType,
                unit_price: newPrice,
                price: newPrice,
                list_price: newPrice,
                price_overridden: false,
                approval_ticket: undefined,
                approved_by: undefined,
                ...NO_LINE_DISCOUNT,
              };
            }
            return item;
          });
          const totals = calculateTotals(newItems, state.discount);
          return { items: newItems, ...totals };
        }),

      setItemPrice: (productId, unitPrice, approval) =>
        set((state) => {
          const newItems = state.items.map((item) => {
            if (item.productId !== productId) return item;
            const list = item.list_price ?? item.price;
            const price = Math.max(round2(unitPrice), list);
            const raised = price > list + 0.0001;
            return {
              ...item, price, unit_price: price, list_price: list, price_overridden: raised,
              approval_ticket: raised ? approval?.ticket : undefined,
              approved_by: raised ? approval?.approvedBy : undefined,
              ...(raised ? NO_LINE_DISCOUNT : {}),
            };
          });
          const totals = calculateTotals(newItems, state.discount);
          return { items: newItems, ...totals };
        }),

      setLineDiscount: (productId, discount, approval) =>
        set((state) => {
          const newItems = state.items.map((item) => {
            if (item.productId !== productId) return item;
            if (!discount || !(discount.value > 0)) return { ...item, ...NO_LINE_DISCOUNT };
            const list = item.list_price ?? item.price;
            return {
              ...item,
              // A line is discounted or price-raised, not both
              price: list, unit_price: list, price_overridden: false, approval_ticket: undefined, approved_by: undefined,
              line_discount_type: discount.type,
              line_discount_value: discount.type === 'percent' ? Math.min(discount.value, 100) : round2(discount.value),
              discount_ticket: approval?.ticket,
              discount_approved_by: approval?.approvedBy,
            };
          });
          return { items: newItems, ...calculateTotals(newItems, state.discount) };
        }),

      setDiscount: (discount) =>
        set((state) => {
          const totals = calculateTotals(state.items, discount);
          return { discount, ...totals, ...(discount > 0 ? {} : { discountApproval: null }) };
        }),

      setDiscountApproval: (discountApproval) => set({ discountApproval }),

      clearCart: () =>
        set({
          items: [],
          discount: 0,
          discountApproval: null,
          subtotal: 0,
          total: 0,
        }),

      replaceItems: (items) =>
        set({ items, discount: 0, discountApproval: null, ...calculateTotals(items, 0) }),

      saveTransaction: (customerName) =>
        set((state) => {
          if (state.items.length === 0) return state;

          const now = new Date();
          const time = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
          const cartNumber = state.savedTransactions.length + 1;
          const finalCustomerName = customerName || `Cart ${cartNumber}`;

          const getInitials = (name: string) => {
            if (name.startsWith('Cart ')) {
              return `C${name.split(' ')[1]}`;
            }
            return name
              .split(' ')
              .map(word => word[0])
              .join('')
              .toUpperCase()
              .slice(0, 2);
          };

          const newTransaction: SavedTransaction = {
            id: `T${Date.now()}`,
            customerName: finalCustomerName,
            customerInitials: getInitials(finalCustomerName),
            itemCount: state.items.length,
            time,
            items: [...state.items],
            discount: state.discount,
            savedAt: now.toISOString(),
          };

          const updatedSaved = filterExpiredTransactions([...state.savedTransactions, newTransaction]);

          return {
            savedTransactions: updatedSaved,
            items: [],
            discount: 0,
            subtotal: 0,
            total: 0,
          };
        }),

      resumeTransaction: (transactionId) =>
        set((state) => {
          const activeSaved = filterExpiredTransactions(state.savedTransactions);
          const transactionToResume = activeSaved.find(t => t.id === transactionId);
          if (!transactionToResume) return state;

          let updatedSavedTransactions = activeSaved.filter(t => t.id !== transactionId);

          // If current cart has items, auto-save it before resuming
          if (state.items.length > 0) {
            const now = new Date();
            const time = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            const cartNumber = updatedSavedTransactions.length + 1;

            const autoSaveName = `Cart ${cartNumber}`;
            const autoSaveTransaction: SavedTransaction = {
              id: `T${Date.now()}_auto`,
              customerName: autoSaveName,
              customerInitials: `C${cartNumber}`,
              itemCount: state.items.length,
              time,
              items: [...state.items],
              discount: state.discount,
              savedAt: now.toISOString(),
            };

            updatedSavedTransactions = [...updatedSavedTransactions, autoSaveTransaction];
          }

          const totals = calculateTotals(transactionToResume.items, transactionToResume.discount);

          return {
            savedTransactions: updatedSavedTransactions,
            items: transactionToResume.items,
            discount: transactionToResume.discount,
            ...totals
          };
        }),

      deleteSavedTransaction: (transactionId) =>
        set((state) => ({
          savedTransactions: state.savedTransactions.filter(t => t.id !== transactionId)
        })),

      clearAllSavedTransactions: () =>
        set({ savedTransactions: [] })
    }),
    {
      name: 'pos-cart-storage',
      partialize: (state) => ({
        tenantId: state.tenantId,
        items: state.items,
        discount: state.discount,
        discountApproval: state.discountApproval,
        subtotal: state.subtotal,
        total: state.total,
        savedTransactions: filterExpiredTransactions(state.savedTransactions),
      }),
      onRehydrateStorage: () => (state) => {
        if (state) {
          state.savedTransactions = filterExpiredTransactions(state.savedTransactions);
          try {
            const rawAuth = localStorage.getItem('headlesspos-auth');
            if (rawAuth) {
              const parsedAuth = JSON.parse(rawAuth);
              const activeTenantId = parsedAuth?.state?.tenant?.id;
              if (activeTenantId && state.tenantId && state.tenantId !== activeTenantId) {
                state.items = [];
                state.savedTransactions = [];
                state.discount = 0;
                state.subtotal = 0;
                state.total = 0;
                state.tenantId = activeTenantId;
              } else if (activeTenantId && !state.tenantId) {
                state.tenantId = activeTenantId;
              }
            }
          } catch {
            // ignore JSON parse errors
          }
        }
      }
    }
  )
);
