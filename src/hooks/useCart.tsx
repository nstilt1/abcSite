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
  /**
   * Distinguishes licensed-software cart items (default, omitted for
   * backwards compat) from physical print-on-demand items. Physical items
   * skip the license-ownership validation and CreateLicense/free-item flow
   * entirely — see checkout/page.tsx and webhook/route.ts.
   */
  kind?: "software" | "physical";
  /** Only present when kind === "physical". Carries the printable design. */
  physical?: PhysicalCartConfig;
};

export type PhysicalCartConfig = {
  /** Which product/mockup this was configured from, e.g. "kaleidomo-hoodie" */
  productSlug: string;
  mockupType: "hoodie" | "tshirt" | "tapestry";
  /** Printify blueprint/print-provider/variant needed to submit the order */
  printifyBlueprintId: number;
  printifyPrintProviderId: number;
  printifyVariantId: number;
  /** Public URL of the rendered kaleidoscope snapshot, uploaded via presign-upload */
  designImageUrl: string;
  /** The slider/preset values used to generate the snapshot, for reference/support */
  presetName: string;
};

type CartContextValue = {
  items: CartItem[];
  cartCount: number;
  cartTotalCents: number;
  addItem: (item: CartItem) => void;
  /**
   * For software items, pass the productId. For physical items (which may
   * have multiple distinct designs of the same product in the cart), pass
   * the item's own itemKey (see exported getCartItemKey below).
   */
  removeItem: (itemKey: string) => void;
  updateQuantity: (itemKey: string, quantity: number) => void;
  clearCart: () => void;
};

/** Public accessor for a cart item's unique key, for use by removeItem/updateQuantity. */
export function getCartItemKey(item: CartItem): string {
  return mergeKey(item);
}

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
 * Merge key for dedup in the cart map.
 * Licensed software: keyed by productId alone (max 1 per product — business rule).
 * Physical items: keyed by productId + designImageUrl, since a shopper may add
 * several distinct customized designs of the same physical product.
 */
function mergeKey(item: CartItem): string {
  if (item.kind === "physical" && item.physical) {
    return `${item.productId}::${item.physical.designImageUrl}`;
  }
  return item.productId;
}

/**
 * Merge two cart arrays. For licensed software, max 1 per productId
 * (as per business rule: one license per product in cart). Physical items
 * are keyed by design so distinct configurations don't overwrite each other.
 */
function mergeCartItems(existing: CartItem[], incoming: CartItem[]): CartItem[] {
  const merged = new Map<string, CartItem>();
  for (const item of existing) merged.set(mergeKey(item), item);
  for (const item of incoming) {
    if (item.kind === "physical") {
      // Physical items keep their real quantity; latest wins on conflict.
      merged.set(mergeKey(item), item);
    } else {
      // Licensed software: quantity is always 1, latest wins
      merged.set(mergeKey(item), { ...item, quantity: 1 });
    }
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
        // mergeCartItems enforces qty 1 for software items; physical items
        // keep whatever quantity the caller passed in.
        setItems((current) => mergeCartItems(current, [item]));
      },
      removeItem: (itemKey) => {
        setItems((current) =>
          current.filter((item) => mergeKey(item) !== itemKey)
        );
      },
      updateQuantity: (itemKey, quantity) => {
        // License items are always qty 1 — this is a no-op for safety.
        // Physical items may have any positive quantity.
        setItems((current) =>
          current
            .map((item) =>
              mergeKey(item) === itemKey
                ? { ...item, quantity: item.kind === "physical" ? Math.max(1, quantity) : 1 }
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