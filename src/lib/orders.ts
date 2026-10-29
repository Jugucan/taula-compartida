// Comandes dels convidats, llegides per l'organitzadora (només lectura; les escriu el servidor).
import { collection, getDocs, limit, orderBy, query } from "firebase/firestore";
import { getClientDb } from "@/lib/firebase-client";
import type { PricedItem } from "@/lib/order-pricing";

export type StoredOrder = { id: string; guestName: string; note: string; items: PricedItem[]; totalCents: number; createdAt: Date | null };

/** Una sola consulta: una lectura per comanda (màxim 300, el límit per trobada). */
export async function listOrders(uid: string, eventId: string): Promise<StoredOrder[]> {
  const q = query(collection(getClientDb(), "workspaces", uid, "events", eventId, "orders"), orderBy("createdAt"), limit(300));
  const snap = await getDocs(q);
  return snap.docs.map((d) => {
    const data = d.data();
    const created = data["createdAt"] as { toDate?: () => Date } | undefined;
    return {
      id: d.id,
      guestName: String(data["guestName"] ?? ""),
      note: String(data["note"] ?? ""),
      items: (data["items"] ?? []) as PricedItem[],
      totalCents: Number(data["totalCents"] ?? 0),
      createdAt: created?.toDate ? created.toDate() : null,
    };
  });
}
