import { create } from 'zustand';

export interface CartItem {
  productId: string;
  name: string;
  sku: string;
  price: number;
  quantity: number;
}

interface CartState {
  items: CartItem[];
  discount: number;
  subtotal: number;
  total: number;
  
  // Actions
  addItem: (item: Omit<CartItem, 'quantity'> & { quantity?: number }) => void;
  removeItem: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  setDiscount: (discount: number) => void;
  clearCart: () => void;
}

const calculateTotals = (items: CartItem[], discount: number) => {
  const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const total = Math.max(0, subtotal - discount);
  return { subtotal, total };
};

export const useCartStore = create<CartState>((set) => ({
  items: [],
  discount: 0,
  subtotal: 0,
  total: 0,

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

      const newItems = state.items.map((i) =>
        i.productId === productId ? { ...i, quantity } : i
      );
      const totals = calculateTotals(newItems, state.discount);
      return { items: newItems, ...totals };
    }),

  setDiscount: (discount) =>
    set((state) => {
      const totals = calculateTotals(state.items, discount);
      return { discount, ...totals };
    }),

  clearCart: () => set({ items: [], discount: 0, subtotal: 0, total: 0 }),
}));
