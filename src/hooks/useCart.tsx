"use client";

import {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { fetchUserAttributes } from "aws-amplify/auth";

export type CartItem = {
  /** software_licensor_product_id */
  productId: string;
  /** download slug, for linking back */
  slug: string;
  name: string;
  /** Stripe price ID */
  priceId: string;
  /** Display price in cents */
  priceCents: number;
  quantity: number;
  /** Human-readable label, e.g. "Perpetual", "Trial" */
  licenseType: string;
};

type CartContextValue = {
  items: CartItem[];
  cartCount: number;
  cartTotalCents: number;
  addItem: (item: CartItem) => void;
  removeItem: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  clearCart: () => void;
};

const ANONYMOUS_CART_KEY = "abc.cart.anonymous";

const CartContext = createContext<CartContextValue | null>(null);

function userCartKey(sub: string) {
  return `abc.cart.users.${sub}`;
}

function readCart(key: string): CartItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeCart(key: string, items: CartItem[]) {
  window.localStorage.setItem(key, JSON.stringify(items));
}

/**
 * Merge two cart arrays. For licensed software, max 1 per productId
 * (as per business rule: one license per product in cart).
 */
function mergeCartItems(existing: CartItem[], incoming: CartItem[]): CartItem[] {
  const merged = new Map<string, CartItem>();
  for (const item of existing) merged.set(item.productId, item);
  for (const item of incoming) {
    // Licensed software: quantity is always 1, latest wins
    merged.set(item.productId, { ...item, quantity: 1 });
  }
  return Array.from(merged.values());
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [cartKey, setCartKey] = useState(ANONYMOUS_CART_KEY);
  const [items, setItems] = useState<CartItem[]>([]);

  useEffect(() => {
    let cancelled = false;

    async function loadCart() {
      let nextKey = ANONYMOUS_CART_KEY;
      try {
        const attributes = await fetchUserAttributes();
        if (attributes.sub) {
          nextKey = userCartKey(attributes.sub);
          const anonymousItems = readCart(ANONYMOUS_CART_KEY);
          const userItems = readCart(nextKey);
          const mergedItems = mergeCartItems(userItems, anonymousItems);
          writeCart(nextKey, mergedItems);
          window.localStorage.removeItem(ANONYMOUS_CART_KEY);
          if (!cancelled) {
            setCartKey(nextKey);
            setItems(mergedItems);
          }
          return;
        }
      } catch {
        nextKey = ANONYMOUS_CART_KEY;
      }
      if (!cancelled) {
        setCartKey(nextKey);
        setItems(readCart(nextKey));
      }
    }

    loadCart();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    writeCart(cartKey, items);
  }, [cartKey, items]);

  const value = useMemo<CartContextValue>(() => {
    const cartCount = items.reduce((sum, item) => sum + item.quantity, 0);
    const cartTotalCents = items.reduce(
      (sum, item) => sum + item.priceCents * item.quantity,
      0
    );

    return {
      items,
      cartCount,
      cartTotalCents,
      addItem: (item) => {
        // Enforce max 1 per product
        setItems((current) =>
          mergeCartItems(current, [{ ...item, quantity: 1 }])
        );
      },
      removeItem: (productId) => {
        setItems((current) =>
          current.filter((item) => item.productId !== productId)
        );
      },
      updateQuantity: (productId, quantity) => {
        // License items are always qty 1 — this is a no-op for safety
        setItems((current) =>
          current
            .map((item) =>
              item.productId === productId
                ? { ...item, quantity: Math.max(1, quantity) }
                : item
            )
            .filter((item) => item.quantity > 0)
        );
      },
      clearCart: () => setItems([]),
    };
  }, [items]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const value = useContext(CartContext);
  if (!value) throw new Error("useCart must be used inside CartProvider.");
  return value;
}
