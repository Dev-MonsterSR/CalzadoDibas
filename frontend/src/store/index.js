import { create } from 'zustand';

const CART_KEY = 'dibas_cart';

const loadCart = () => {
  try {
    const data = localStorage.getItem(CART_KEY);
    if (!data) return [];
    const parsed = JSON.parse(data);
    // Migración: descartar items viejos que no tengan warehouse o size
    // (ocurre cuando el usuario tenía items en el carrito antes de la feature de tallas)
    const migrated = (Array.isArray(parsed) ? parsed : []).filter(item =>
      item && item.product && item.size != null && item.warehouse
    );
    if (migrated.length !== (Array.isArray(parsed) ? parsed.length : 0)) {
      localStorage.setItem(CART_KEY, JSON.stringify(migrated));
    }
    return migrated;
  } catch { return []; }
};

const saveCart = (items) => {
  localStorage.setItem(CART_KEY, JSON.stringify(items));
};

export const useAuthStore = create((set) => ({
  user: null,
  token: null,
  loading: true,

  init: () => {
    const token = localStorage.getItem('dibas_token');
    const userStr = localStorage.getItem('dibas_user');
    if (token && userStr) {
      set({ user: JSON.parse(userStr), token, loading: false });
    } else {
      set({ loading: false });
    }
  },

  login: (token, user) => {
    localStorage.setItem('dibas_token', token);
    localStorage.setItem('dibas_user', JSON.stringify(user));
    set({ token, user });
  },

  logout: () => {
    localStorage.removeItem('dibas_token');
    localStorage.removeItem('dibas_user');
    set({ user: null, token: null });
  },

  updateUser: (userData) => {
    set((state) => {
      const updated = { ...state.user, ...userData };
      localStorage.setItem('dibas_user', JSON.stringify(updated));
      return { user: updated };
    });
  },
}));

export const useCartStore = create((set, get) => ({
  items: loadCart(),

  addItem: (product, size, quantity = 1, warehouse = null) => {
    set((state) => {
      const price = product.price_retail;
      const existing = state.items.find(
        (i) => i.product.id === product.id && i.size === size && i.warehouse === warehouse
      );
      let newItems;
      if (existing) {
        newItems = state.items.map((i) =>
          i.product.id === product.id && i.size === size && i.warehouse === warehouse
            ? { ...i, quantity: i.quantity + quantity }
            : i
        );
      } else {
        newItems = [...state.items, { product, size, quantity, price, warehouse }];
      }
      saveCart(newItems);
      return { items: newItems };
    });
  },

  removeItem: (index) => {
    set((state) => {
      const newItems = state.items.filter((_, i) => i !== index);
      saveCart(newItems);
      return { items: newItems };
    });
  },

  updateQuantity: (index, quantity) => {
    if (quantity <= 0) {
      get().removeItem(index);
      return;
    }
    set((state) => {
      const newItems = state.items.map((i, idx) =>
        idx === index ? { ...i, quantity } : i
      );
      saveCart(newItems);
      return { items: newItems };
    });
  },

  clear: () => {
    saveCart([]);
    set({ items: [] });
  },

  getSubtotal: () => {
    const { items } = get();
    const totalItems = items.reduce((sum, i) => sum + i.quantity, 0);
    const isWholesale = totalItems >= 3;
    return items.reduce((sum, i) => {
      const price = isWholesale
        ? (i.product.price_wholesale || i.product.price_retail)
        : i.product.price_retail;
      return sum + price * i.quantity;
    }, 0);
  },

  getTotal: () => {
    return get().getSubtotal();
  },

  isWholesale: () => {
    return get().items.reduce((sum, i) => sum + i.quantity, 0) >= 3;
  },
}));
