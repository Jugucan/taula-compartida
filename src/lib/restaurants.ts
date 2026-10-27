// Restaurants i cartes de l'organitzadora (Firestore, des del navegador).
// Model: workspaces/{uid}/restaurants/{id} amb la carta dins del mateix document
// (una sola lectura per restaurant). Preus en cèntims enters.
import { collection, doc, getDocs, limit, orderBy, query, serverTimestamp, setDoc } from "firebase/firestore";
import type { Dish, MenuCategory } from "@/data/demo";
import { parseEuroToCents } from "@/lib/money";
import { getClientDb } from "@/lib/firebase-client";

export const CATEGORIES = ["Entrants", "Primers", "Segons", "Postres", "Begudes", "Altres"] as const;
export const MAX_DISHES = 200;

export type DishDraft = { key: string; category: string; name: string; price: string };
export type StoredRestaurant = { id: string; name: string; url: string; categories: MenuCategory[]; dishCount: number };

type BuildResult = { ok: true; categories: MenuCategory[]; dishCount: number } | { ok: false; error: string };

const slug = (text: string) => text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

/** Valida els plats escrits i els converteix en una carta amb preus en cèntims. */
export function buildMenu(drafts: DishDraft[], makeId: () => string = () => crypto.randomUUID().slice(0, 8)): BuildResult {
  const filled = drafts.filter((d) => d.name.trim() || d.price.trim());
  if (filled.length === 0) return { ok: false, error: "Afegeix almenys un plat." };
  if (filled.length > MAX_DISHES) return { ok: false, error: `Una carta pot tenir com a màxim ${MAX_DISHES} plats.` };

  const byCategory = new Map<string, Dish[]>();
  for (const draft of filled) {
    const name = draft.name.trim();
    if (!name) return { ok: false, error: "Hi ha un plat sense nom." };
    if (name.length > 80) return { ok: false, error: `El nom «${name.slice(0, 20)}…» és massa llarg.` };
    const price = parseEuroToCents(draft.price);
    if (price === null || price <= 0) return { ok: false, error: `Revisa el preu de «${name}». Escriu-lo així: 12,50` };
    const category = (CATEGORIES as readonly string[]).includes(draft.category) ? draft.category : "Altres";
    const list = byCategory.get(category) ?? [];
    list.push({ id: makeId(), name, price });
    byCategory.set(category, list);
  }

  const categories = CATEGORIES.filter((c) => byCategory.has(c)).map((c) => ({ id: slug(c), name: c, dishes: byCategory.get(c)! }));
  return { ok: true, categories, dishCount: filled.length };
}

/** Accepta un enllaç buit (opcional) o un enllaç http(s) correcte. */
export function cleanUrl(input: string): { ok: true; url: string } | { ok: false } {
  const text = input.trim();
  if (!text) return { ok: true, url: "" };
  try {
    const url = new URL(text);
    if (url.protocol !== "http:" && url.protocol !== "https:") return { ok: false };
    return { ok: true, url: url.toString() };
  } catch {
    return { ok: false };
  }
}

const restaurantsPath = (uid: string) => collection(getClientDb(), "workspaces", uid, "restaurants");

/** Una sola consulta (màxim 100 restaurants). */
export async function listRestaurants(uid: string): Promise<StoredRestaurant[]> {
  const snap = await getDocs(query(restaurantsPath(uid), orderBy("name"), limit(100)));
  return snap.docs.map((d) => {
    const data = d.data();
    return { id: d.id, name: String(data["name"] ?? ""), url: String(data["url"] ?? ""), categories: (data["categories"] ?? []) as MenuCategory[], dishCount: Number(data["dishCount"] ?? 0) };
  });
}

/** Desa un restaurant amb un identificador fix: reintentar no el duplica. */
export async function saveRestaurant(uid: string, id: string, data: { name: string; url: string; categories: MenuCategory[]; dishCount: number }) {
  await setDoc(doc(restaurantsPath(uid), id), { ...data, version: 1, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
}
