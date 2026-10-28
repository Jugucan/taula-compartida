// Decideix què fer amb una comanda enviada per un convidat. Lògica pura, sense base de dades (es prova a part).
// El navegador només diu "quins plats i quantes unitats"; els preus es treuen sempre de la carta del servidor.
import type { MenuCategory } from "@/data/demo";
import { deadlinePassed, type EventStatus } from "@/lib/event-time";
import { priceOrder, type PricedItem } from "@/lib/order-pricing";

export const MAX_ORDERS_PER_EVENT = 300;
export const MAX_NAME = 60;
export const MAX_NOTE = 300;

export type SubmitInput = { orderId: unknown; token: unknown; guestName: unknown; note: unknown; items: unknown };
export type SubmitDecision =
  | { ok: true; action: "create" | "update"; order: { guestName: string; note: string; items: PricedItem[]; totalCents: number }; deltaCount: number; deltaTotalCents: number }
  | { ok: false; error: string };

export const isValidOrderId = (v: unknown): v is string => typeof v === "string" && /^[A-Za-z0-9-]{8,64}$/.test(v);
export const isValidToken = (v: unknown): v is string => typeof v === "string" && /^[A-Za-z0-9_-]{32,128}$/.test(v);

export function decideSubmit(args: {
  event: { status: EventStatus; deadline: string; menu: MenuCategory[]; orderCount: number };
  existing: { totalCents: number; tokenMatches: boolean } | null;
  input: SubmitInput;
  now?: Date;
}): SubmitDecision {
  const { event, existing, input, now = new Date() } = args;

  if (!isValidOrderId(input.orderId) || !isValidToken(input.token)) return { ok: false, error: "No s'ha pogut identificar la comanda. Recarrega la pàgina i torna-ho a provar." };
  if (event.status !== "open" || deadlinePassed(event.deadline, now)) return { ok: false, error: "Les comandes ja estan tancades. Parla amb l'organitzadora si encara vols venir." };

  const guestName = typeof input.guestName === "string" ? input.guestName.replace(/\s+/g, " ").trim() : "";
  if (guestName.length < 2) return { ok: false, error: "Escriu el teu nom per continuar." };
  if (guestName.length > MAX_NAME) return { ok: false, error: "El nom és massa llarg." };
  const note = typeof input.note === "string" ? input.note.trim() : "";
  if (note.length > MAX_NOTE) return { ok: false, error: "La nota és massa llarga." };

  const priced = priceOrder(event.menu, input.items);
  if (!priced.ok) return { ok: false, error: priced.error };
  const order = { guestName, note, items: priced.items, totalCents: priced.totalCents };

  if (existing) {
    if (!existing.tokenMatches) return { ok: false, error: "No tens permís per canviar aquesta comanda." };
    return { ok: true, action: "update", order, deltaCount: 0, deltaTotalCents: priced.totalCents - existing.totalCents };
  }
  if (event.orderCount >= MAX_ORDERS_PER_EVENT) return { ok: false, error: "S'ha arribat al màxim de comandes d'aquesta trobada." };
  return { ok: true, action: "create", order, deltaCount: 1, deltaTotalCents: priced.totalCents };
}
