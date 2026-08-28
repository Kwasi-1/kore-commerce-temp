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
}


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
  subtotal: number;
  total: number;
  savedTransactions: SavedTransaction[];
  panelState: 'collapsed' | 'default' | 'expanded';
  
  // Actions
  addItem: (item: Omit<CartItem, 'quantity'> & { quantity?: number }) => void;
  removeItem: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  updateItemTier: (productId: string, newTier: { id: string; name: string; units_per_tier: number; price: number }) => void;
  updateItemPriceType: (productId: string, priceType: 'retail' | 'wholesale', newPrice: number) => void;
  setDiscount: (discount: number) => void;
  clearCart: () => void;
  
  // Saved Transactions Actions
  saveTransaction: (customerName: string) => void;
  resumeTransaction: (transactionId: string) => void;
  deleteSavedTransaction: (transactionId: string) => void;
  clearAllSavedTransactions: () => void;
  
  // UI State Actions
  setPanelState: (state: 'collapsed' | 'default' | 'expanded') => void;
}

const calculateTotals = (items: CartItem[], discount: number) => {
  const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const total = Math.max(0, subtotal - discount);
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
      items: [],
      discount: 0,
      subtotal: 0,
      total: 0,
      savedTransactions: [],
      panelState: 'default',

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
            newItems = [...state.items, { ...newItem, quantity: newItem.quantity || 1 }];
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
          const newItems = state.items.map((item) => {
            if (item.productId === productId) {
              const newProductId = `${item.variant_id}-${newTier.id}`;
              return {
                ...item,
                productId: newProductId,
                packaging_tier_id: newTier.id,
                tier_name: newTier.name,
                units_per_tier: newTier.units_per_tier,
                unit_price: newTier.price,
                price: newTier.price
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
                price: newPrice
              };
            }
            return item;
          });
          const totals = calculateTotals(newItems, state.discount);
          return { items: newItems, ...totals };
        }),

      setDiscount: (discount) =>
        set((state) => {
          const totals = calculateTotals(state.items, discount);
          return { discount, ...totals };
        }),

      clearCart: () =>
        set({
          items: [],
          discount: 0,
          subtotal: 0,
          total: 0,
        }),

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
        items: state.items,
        discount: state.discount,
        subtotal: state.subtotal,
        total: state.total,
        savedTransactions: filterExpiredTransactions(state.savedTransactions),
      }),
      onRehydrateStorage: () => (state) => {
        if (state) {
          state.savedTransactions = filterExpiredTransactions(state.savedTransactions);
        }
      }
    }
  )
);
