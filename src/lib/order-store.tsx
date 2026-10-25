// Browser-local simulation only; not production identity or multi-device persistence.
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { demoOrders, findDish, type Dish, type GuestOrder } from "@/data/demo";
import { sharedCost, upsertOrder } from "./meal-rules";

export type Line = { dish: Dish; qty: number; options: string[] };
type OrderState = {
  quantities: Record<string, number>; selections: Record<string, string[]>; lines: Line[]; count: number;
  guestName: string; note: string; sent: { lines: Line[]; guestName: string } | null;
  orders: GuestOrder[]; extra: number; cost: ReturnType<typeof sharedCost>; editingId: string | null; remembered: GuestOrder | undefined;
  setQty: (id: string, qty: number) => void; setOption: (id: string, index: number, option: string) => void;
  setGuestName: (v: string) => void; setNote: (v: string) => void; setExtra: (v: number) => void;
  simulateSend: () => Promise<void>; recover: (id: string) => void; reset: () => void;
};
const OrderContext = createContext<OrderState | null>(null);
const storageKey = "taula-shared-meal-prototype-v1";

export function OrderProvider({ children }: { children: ReactNode }) {
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [selections, setSelections] = useState<Record<string, string[]>>({});
  const [guestName, setGuestName] = useState("");
  const [note, setNote] = useState("");
  const [orders, setOrders] = useState<GuestOrder[]>(demoOrders);
  const [extra, setExtraState] = useState(0);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [rememberedId, setRememberedId] = useState<string | null>(null);
  const [sent, setSent] = useState<OrderState["sent"]>(null);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) {
        const saved = JSON.parse(raw);
        if (Array.isArray(saved.orders) && saved.orders.every((o: GuestOrder) => typeof o.id === "string" && typeof o.guest === "string" && Array.isArray(o.items))) setOrders(saved.orders);
        if (typeof saved.extra === "number" && Number.isFinite(saved.extra)) setExtraState(Math.max(0, saved.extra));
        if (typeof saved.rememberedId === "string") setRememberedId(saved.rememberedId);
      }
    } catch { /* Storage unavailable: keep session-only demo. */ }
    setReady(true);
  }, []);
  useEffect(() => {
    if (!ready) return;
    try { localStorage.setItem(storageKey, JSON.stringify({ orders, extra, rememberedId })); } catch { /* Session remains usable. */ }
  }, [orders, extra, rememberedId, ready]);

  const value = useMemo<OrderState>(() => {
    const lines = Object.entries(quantities).flatMap(([id, qty]) => {
      const dish = findDish(id);
      return dish && qty > 0 ? [{ dish, qty, options: dish.options ? Array.from({ length: qty }, (_, i) => selections[id]?.[i] ?? dish.options?.values[0] ?? "") : [] }] : [];
    });
    return {
      quantities, selections, lines, count: lines.reduce((sum, line) => sum + line.qty, 0), guestName, note, sent, orders, extra,
      cost: sharedCost(orders, extra), editingId, remembered: orders.find(o => o.id === rememberedId),
      setQty: (id, qty) => setQuantities(q => ({ ...q, [id]: Math.max(0, Math.min(20, qty)) })),
      setOption: (id, index, option) => setSelections(s => { const values = [...(s[id] ?? [])]; values[index] = option; return { ...s, [id]: values }; }),
      setGuestName, setNote, setExtra: v => setExtraState(Number.isFinite(v) ? Math.max(0, Math.round(v * 100) / 100) : 0),
      simulateSend: async () => {
        await new Promise(r => setTimeout(r, 500));
        const id = editingId ?? crypto.randomUUID();
        const order: GuestOrder = { id, guest: guestName.trim(), note, sentAt: "ara mateix", items: lines.map(l => ({ dishId: l.dish.id, qty: l.qty, options: l.options })) };
        setOrders(previous => upsertOrder(previous, order));
        setRememberedId(id); setEditingId(id); setSent({ lines, guestName: order.guest });
      },
      recover: id => {
        const order = orders.find(o => o.id === id);
        if (!order) return;
        setQuantities(Object.fromEntries(order.items.map(i => [i.dishId, i.qty])));
        setSelections(Object.fromEntries(order.items.map(i => [i.dishId, i.options ?? []])));
        setGuestName(order.guest); setNote(order.note ?? ""); setEditingId(id); setRememberedId(id); setSent(null);
      },
      reset: () => { setQuantities({}); setSelections({}); setGuestName(""); setNote(""); setEditingId(null); setSent(null); },
    };
  }, [quantities, selections, guestName, note, sent, orders, extra, editingId, rememberedId]);
  return <OrderContext.Provider value={value}>{children}</OrderContext.Provider>;
}
export function useOrder() {
  const value = useContext(OrderContext);
  if (!value) throw new Error("useOrder must be used inside OrderProvider");
  return value;
}