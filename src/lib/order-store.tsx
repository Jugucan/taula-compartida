// SIMULATED guest order state. Swap this provider for real persistence later;
// UI components only consume the hook below.
import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import { findDish, type Dish } from "@/data/demo";

type Line = { dish: Dish; qty: number };

type OrderState = {
  quantities: Record<string, number>;
  lines: Line[];
  count: number;
  total: number;
  guestName: string;
  note: string;
  sent: { lines: Line[]; total: number; guestName: string } | null;
  setQty: (dishId: string, qty: number) => void;
  setGuestName: (v: string) => void;
  setNote: (v: string) => void;
  simulateSend: () => Promise<void>;
  reset: () => void;
};

const OrderContext = createContext<OrderState | null>(null);

export function OrderProvider({ children }: { children: ReactNode }) {
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [guestName, setGuestName] = useState("");
  const [note, setNote] = useState("");
  const [sent, setSent] = useState<OrderState["sent"]>(null);

  const value = useMemo<OrderState>(() => {
    const lines = Object.entries(quantities)
      .filter(([, q]) => q > 0)
      .map(([id, qty]) => ({ dish: findDish(id)!, qty }))
      .filter((l) => l.dish);
    const count = lines.reduce((s, l) => s + l.qty, 0);
    const total = lines.reduce((s, l) => s + l.qty * l.dish.price, 0);
    return {
      quantities, lines, count, total, guestName, note, sent,
      setQty: (id, qty) => setQuantities((q) => ({ ...q, [id]: Math.max(0, Math.min(20, qty)) })),
      setGuestName, setNote,
      simulateSend: async () => {
        await new Promise((r) => setTimeout(r, 1200));
        setSent({ lines, total, guestName });
      },
      reset: () => { setQuantities({}); setGuestName(""); setNote(""); setSent(null); },
    };
  }, [quantities, guestName, note, sent]);

  return <OrderContext.Provider value={value}>{children}</OrderContext.Provider>;
}

export function useOrder() {
  const ctx = useContext(OrderContext);
  if (!ctx) throw new Error("useOrder must be used inside OrderProvider");
  return ctx;
}
