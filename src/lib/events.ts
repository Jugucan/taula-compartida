// Trobades de l'organitzadora (Firestore, des del navegador).
// Model: workspaces/{uid}/events/{id}, amb una CÒPIA de la carta (preus en cèntims) feta en crear-la.
// A més, links/{codi} -> { wsId, eventId } permet que el servidor trobi la trobada a partir de l'enllaç públic.
import { collection, doc, getDoc, getDocs, limit, orderBy, query, serverTimestamp, updateDoc, writeBatch } from "firebase/firestore";
import type { MenuCategory } from "@/data/demo";
import { getClientDb } from "@/lib/firebase-client";
import { parseEuroToCents } from "@/lib/money";
import type { StoredRestaurant } from "@/lib/restaurants";

import { deadlinePassed, effectiveStatus, todayInMadrid, type EventStatus } from "@/lib/event-time";
export { deadlinePassed, effectiveStatus, todayInMadrid, type EventStatus };

export type StoredEvent = {
  id: string;
  name: string;
  restaurantId: string;
  restaurantName: string;
  menu: MenuCategory[];
  dishCount: number;
  dateTime: string; // "2026-12-18T21:00"
  deadline: string; // "2026-12-15"
  budgetCents: number | null;
  extraCents: number;
  status: EventStatus;
  publicCode: string;
};

// ---------- Lògica pura (amb tests) ----------

export type EventInput = { name: string; dateTime: string; deadline: string; budget: string; extra: string; restaurant: StoredRestaurant | undefined };
export type EventDraft = Pick<StoredEvent, "name" | "restaurantId" | "restaurantName" | "menu" | "dishCount" | "dateTime" | "deadline" | "budgetCents" | "extraCents">;

const validDate = (s: string) => /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(Date.parse(s));
const validDateTime = (s: string) => /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(s) && !Number.isNaN(Date.parse(s));

export function buildEvent(input: EventInput): { ok: true; event: EventDraft } | { ok: false; error: string } {
  const name = input.name.trim();
  if (!name) return { ok: false, error: "Escriu el nom de la trobada." };
  if (name.length > 80) return { ok: false, error: "El nom de la trobada és massa llarg." };
  if (!validDateTime(input.dateTime)) return { ok: false, error: "Tria el dia i l'hora de la trobada." };
  if (!validDate(input.deadline)) return { ok: false, error: "Tria la data límit per triar els plats." };
  if (input.deadline > input.dateTime.slice(0, 10)) return { ok: false, error: "La data límit ha de ser abans de la trobada (o el mateix dia)." };

  let budgetCents: number | null = null;
  if (input.budget.trim()) {
    budgetCents = parseEuroToCents(input.budget);
    if (budgetCents === null || budgetCents <= 0) return { ok: false, error: "Revisa el pressupost. Escriu-lo així: 520 o 520,50." };
  }
  let extraCents = 0;
  if (input.extra.trim()) {
    const parsed = parseEuroToCents(input.extra);
    if (parsed === null) return { ok: false, error: "Revisa l'extra per persona. Escriu-lo així: 3 o 3,50." };
    extraCents = parsed;
  }
  const r = input.restaurant;
  if (!r) return { ok: false, error: "Tria un restaurant." };
  if (r.dishCount === 0) return { ok: false, error: "Aquest restaurant no té cap plat. Afegeix-ne abans de crear la trobada." };

  return { ok: true, event: { name, restaurantId: r.id, restaurantName: r.name, menu: r.categories, dishCount: r.dishCount, dateTime: input.dateTime, deadline: input.deadline, budgetCents, extraCents } };
}

/** Valida la nova data límit en tornar a obrir les comandes. */
export function validateNewDeadline(newDeadline: string, eventDateTime: string, now: Date = new Date()): { ok: true } | { ok: false; error: string } {
  if (!validDate(newDeadline)) return { ok: false, error: "Tria la nova data límit." };
  if (deadlinePassed(newDeadline, now)) return { ok: false, error: "La data límit ha de ser d'avui o d'un dia futur." };
  if (newDeadline > eventDateTime.slice(0, 10)) return { ok: false, error: "La data límit no pot ser posterior a la trobada. Si la trobada s'ha posposat, primer modifica la seva data." };
  return { ok: true };
}

const NEXT: Record<EventStatus, EventStatus[]> = { draft: ["open"], open: ["closed", "done"], closed: ["open", "done"], done: ["open"] };
export const canTransition = (from: EventStatus, to: EventStatus) => NEXT[from].includes(to);

/** Codi aleatori de 16 caràcters (80 bits) per a l'enllaç dels convidats. Impossible d'endevinar. */
export function newPublicCode(): string {
  const alphabet = "abcdefghjkmnpqrstuvwxyz23456789"; // sense lletres que es confonen
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  return Array.from(bytes, (b) => alphabet[b % alphabet.length]).join("");
}

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
function parse(dateTime: string) {
  const [d = "", t = "00:00"] = dateTime.split("T");
  const [y = 0, m = 1, day = 1] = d.split("-").map(Number);
  const [h = 0, min = 0] = t.split(":").map(Number);
  return new Date(y, m - 1, day, h, min);
}
/** "Divendres 18 de desembre · 21:00" */
export function formatEventDate(dateTime: string) {
  const date = parse(dateTime);
  const day = new Intl.DateTimeFormat("ca", { weekday: "long", day: "numeric", month: "long" }).format(date).replace(",", "");
  const time = dateTime.split("T")[1] ?? "";
  return `${cap(day)}${time ? ` · ${time}` : ""}`;
}
/** "dimarts 15 de desembre" */
export function formatDeadline(date: string) {
  return new Intl.DateTimeFormat("ca", { weekday: "long", day: "numeric", month: "long" }).format(parse(date)).replace(",", "");
}

// ---------- Firestore ----------

const eventsPath = (uid: string) => collection(getClientDb(), "workspaces", uid, "events");

function toEvent(id: string, d: Record<string, unknown>): StoredEvent {
  return {
    id,
    name: String(d["name"] ?? ""),
    restaurantId: String(d["restaurantId"] ?? ""),
    restaurantName: String(d["restaurantName"] ?? ""),
    menu: (d["menu"] ?? []) as MenuCategory[],
    dishCount: Number(d["dishCount"] ?? 0),
    dateTime: String(d["dateTime"] ?? ""),
    deadline: String(d["deadline"] ?? ""),
    budgetCents: typeof d["budgetCents"] === "number" ? d["budgetCents"] : null,
    extraCents: Number(d["extraCents"] ?? 0),
    status: (d["status"] as EventStatus) ?? "draft",
    publicCode: String(d["publicCode"] ?? ""),
  };
}

/** Les 10 trobades més recents: una lectura per trobada. */
export async function listEvents(uid: string): Promise<StoredEvent[]> {
  const snap = await getDocs(query(eventsPath(uid), orderBy("createdAt", "desc"), limit(10)));
  return snap.docs.map((d) => toEvent(d.id, d.data()));
}

export async function getEvent(uid: string, id: string): Promise<StoredEvent | null> {
  const snap = await getDoc(doc(eventsPath(uid), id));
  return snap.exists() ? toEvent(snap.id, snap.data()) : null;
}

/** Crea la trobada i el seu enllaç en una sola operació atòmica (identificadors fixos: reintentar no duplica). */
export async function createEvent(uid: string, id: string, publicCode: string, event: EventDraft) {
  const db = getClientDb();
  const batch = writeBatch(db);
  batch.set(doc(eventsPath(uid), id), { ...event, status: "draft", publicCode, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
  batch.set(doc(db, "links", publicCode), { wsId: uid, eventId: id });
  await batch.commit();
}

export async function setEventStatus(uid: string, id: string, status: EventStatus) {
  await updateDoc(doc(eventsPath(uid), id), { status, updatedAt: serverTimestamp() });
}

/** Modifica totes les dades d'una trobada (l'estat i l'enllaç no canvien). */
export async function updateEvent(uid: string, id: string, event: EventDraft) {
  await updateDoc(doc(eventsPath(uid), id), { ...event, updatedAt: serverTimestamp() });
}

/** Torna a obrir les comandes; si cal, amb una nova data límit. */
export async function reopenEvent(uid: string, id: string, newDeadline?: string) {
  await updateDoc(doc(eventsPath(uid), id), { status: "open", ...(newDeadline ? { deadline: newDeadline } : {}), updatedAt: serverTimestamp() });
}
