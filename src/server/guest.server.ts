// Accés dels CONVIDATS a les dades, només des del servidor (Admin SDK).
// Els convidats no entren mai directament a Firestore: aquí es comprova tot.
import { createHash, timingSafeEqual } from "node:crypto";
import type { MenuCategory } from "@/data/demo";
import { effectiveStatus, type EventStatus } from "@/lib/event-time";
import type { MyOrder, PublicEvent, SendOrderInput, SendOrderResult } from "@/lib/guest-types";
import { decideSubmit, isValidOrderId, isValidToken } from "@/lib/order-submit";
import { getDb } from "@/server/firebase-admin.server";

const CODE = /^[a-z2-9]{16}$/;
const hash = (token: string) => createHash("sha256").update(token).digest("hex");
const sameHash = (a: string, b: string) => a.length === b.length && timingSafeEqual(Buffer.from(a), Buffer.from(b));

async function resolve(code: unknown) {
  if (typeof code !== "string" || !CODE.test(code)) return null;
  const link = await getDb().doc(`links/${code}`).get();
  const data = link.data();
  if (!link.exists || !data || typeof data["wsId"] !== "string" || typeof data["eventId"] !== "string") return null;
  return { wsId: data["wsId"], eventId: data["eventId"] };
}

const eventPath = (r: { wsId: string; eventId: string }) => `workspaces/${r.wsId}/events/${r.eventId}`;

/** 2 lectures: l'enllaç i la trobada. */
export async function fetchPublicEvent(code: unknown): Promise<PublicEvent | null> {
  const ref = await resolve(code);
  if (!ref) return null;
  const snap = await getDb().doc(eventPath(ref)).get();
  const d = snap.data();
  if (!snap.exists || !d) return null;

  const { status } = effectiveStatus((d["status"] as EventStatus) ?? "draft", String(d["deadline"] ?? ""));
  const stats = (d["stats"] ?? {}) as { count?: number; totalCents?: number };
  return {
    name: String(d["name"] ?? ""),
    restaurantName: String(d["restaurantName"] ?? ""),
    dateTime: String(d["dateTime"] ?? ""),
    deadline: String(d["deadline"] ?? ""),
    status,
    extraCents: Number(d["extraCents"] ?? 0),
    // La carta només s'envia quan es pot triar.
    menu: status === "open" ? ((d["menu"] ?? []) as MenuCategory[]) : [],
    stats: { count: Number(stats.count ?? 0), totalCents: Number(stats.totalCents ?? 0) },
  };
}

/** Només retorna la comanda si el codi personal coincideix. 2 lectures. */
export async function fetchMyOrder(code: unknown, orderId: unknown, token: unknown): Promise<MyOrder | null> {
  if (!isValidOrderId(orderId) || !isValidToken(token)) return null;
  const ref = await resolve(code);
  if (!ref) return null;
  const snap = await getDb().doc(`${eventPath(ref)}/orders/${orderId}`).get();
  const d = snap.data();
  if (!snap.exists || !d || typeof d["tokenHash"] !== "string" || !sameHash(d["tokenHash"], hash(token))) return null;
  const items = ((d["items"] ?? []) as { dishId: string; qty: number; options?: string[] }[]).map((i) => ({ dishId: i.dishId, qty: i.qty, options: i.options ?? [] }));
  return { guestName: String(d["guestName"] ?? ""), note: String(d["note"] ?? ""), items };
}

/** Crea o actualitza una comanda en una transacció: 3 lectures i 2 escriptures. Repetir l'enviament no la duplica. */
export async function saveOrder(input: SendOrderInput): Promise<SendOrderResult> {
  const ref = await resolve(input.code);
  if (!ref) return { ok: false, error: "Aquest enllaç no és correcte." };
  if (!isValidOrderId(input.orderId) || !isValidToken(input.token)) return { ok: false, error: "No s'ha pogut identificar la comanda. Recarrega la pàgina i torna-ho a provar." };

  const db = getDb();
  const eventRef = db.doc(eventPath(ref));
  const orderRef = db.doc(`${eventPath(ref)}/orders/${input.orderId}`);
  const tokenHash = hash(input.token);

  return db.runTransaction(async (tx): Promise<SendOrderResult> => {
    const [eventSnap, orderSnap] = await Promise.all([tx.get(eventRef), tx.get(orderRef)]);
    const e = eventSnap.data();
    if (!eventSnap.exists || !e) return { ok: false, error: "Aquest enllaç no és correcte." };
    const stats = (e["stats"] ?? {}) as { count?: number; totalCents?: number };
    const count = Number(stats.count ?? 0);
    const total = Number(stats.totalCents ?? 0);
    const old = orderSnap.exists ? orderSnap.data() : undefined;

    const decision = decideSubmit({
      event: { status: (e["status"] as EventStatus) ?? "draft", deadline: String(e["deadline"] ?? ""), menu: (e["menu"] ?? []) as MenuCategory[], orderCount: count },
      existing: old ? { totalCents: Number(old["totalCents"] ?? 0), tokenMatches: typeof old["tokenHash"] === "string" && sameHash(old["tokenHash"], tokenHash) } : null,
      input,
    });
    if (!decision.ok) return decision;

    const now = new Date();
    if (decision.action === "create") tx.create(orderRef, { ...decision.order, tokenHash, createdAt: now, updatedAt: now });
    else tx.update(orderRef, { ...decision.order, updatedAt: now });
    tx.update(eventRef, { stats: { count: count + decision.deltaCount, totalCents: total + decision.deltaTotalCents } });
    return { ok: true };
  });
}
