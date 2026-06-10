import { create } from 'zustand';

export interface CartItem {
  productId: string;
  name: string;
  sku: string;
  price: number;
  quantity: number;
  imageUrl?: string;
  category?: string;
  stock_quantity?: number;
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
  setDiscount: (discount: number) => void;
  clearCart: () => void;
  
  // Saved Transactions Actions
  saveTransaction: (customerName: string) => void;
  resumeTransaction: (transactionId: string) => void;
  
  // UI State Actions
  setPanelState: (state: 'collapsed' | 'default' | 'expanded') => void;
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

  saveTransaction: (customerName) =>
    set((state) => {
      if (state.items.length === 0) return state; // Nothing to save
      
      const now = new Date();
      const time = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      const cartNumber = state.savedTransactions.length + 1;
      
      const finalCustomerName = customerName.trim() || `Cart ${cartNumber}`;
      
      const getInitials = (name: string) => {
        if (name.startsWith("Cart ")) return `C${cartNumber}`;
        const words = name.split(" ");
        if (words.length >= 2) {
          return `${words[0][0]}${words[1][0]}`.toUpperCase();
        }
        return name.substring(0, 2).toUpperCase();
      };
      
      const newTransaction: SavedTransaction = {
        id: `T${Date.now()}`, // Unique ID
        customerName: finalCustomerName,
        customerInitials: getInitials(finalCustomerName),
        itemCount: state.items.length,
        time,
        items: [...state.items],
        discount: state.discount,
        savedAt: now.toISOString(),
      };
      
      return {
        savedTransactions: [...state.savedTransactions, newTransaction],
        items: [],
        discount: 0,
        subtotal: 0,
        total: 0,
      };
    }),

  resumeTransaction: (transactionId) =>
    set((state) => {
      const transactionToResume = state.savedTransactions.find(t => t.id === transactionId);
      if (!transactionToResume) return state;

      let updatedSavedTransactions = state.savedTransactions.filter(t => t.id !== transactionId);

      // If current cart has items, auto-save it before resuming
      if (state.items.length > 0) {
        const now = new Date();
        const time = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        const cartNumber = state.savedTransactions.length + 1;
        
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
}));
