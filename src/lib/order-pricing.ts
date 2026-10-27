// Càlcul i validació d'una comanda a partir de la carta del SERVIDOR.
// El navegador només diu "quin plat i quantes unitats"; els preus i noms es treuen sempre de la carta.
// Tots els imports són en cèntims enters.
import type { MenuCategory } from "@/data/demo";

export type OrderItemInput = { dishId: string; qty: number; options?: string[] };
export type PricedItem = {
  dishId: string;
  name: string;
  unitPriceCents: number;
  qty: number;
  options: string[];
  subtotalCents: number;
};
export type PricingResult =
  | { ok: true; items: PricedItem[]; totalCents: number }
  | { ok: false; error: string };

export const MAX_QTY_PER_DISH = 20;
export const MAX_DISHES_PER_ORDER = 40;

export function priceOrder(menu: MenuCategory[], input: unknown): PricingResult {
  if (!Array.isArray(input) || input.length === 0) return { ok: false, error: "La comanda és buida." };
  if (input.length > MAX_DISHES_PER_ORDER) return { ok: false, error: "La comanda té massa plats." };

  const dishes = new Map(menu.flatMap((c) => c.dishes).map((d) => [d.id, d]));
  const seen = new Set<string>();
  const items: PricedItem[] = [];

  for (const raw of input) {
    if (typeof raw !== "object" || raw === null) return { ok: false, error: "Comanda no vàlida." };
    const { dishId, qty, options } = raw as Record<string, unknown>;

    if (typeof dishId !== "string") return { ok: false, error: "Comanda no vàlida." };
    if (seen.has(dishId)) return { ok: false, error: "Hi ha un plat repetit a la comanda." };
    seen.add(dishId);

    const dish = dishes.get(dishId);
    if (!dish) return { ok: false, error: "Un dels plats ja no és a la carta." };

    if (typeof qty !== "number" || !Number.isInteger(qty) || qty < 1 || qty > MAX_QTY_PER_DISH) {
      return { ok: false, error: "La quantitat d'un plat no és vàlida." };
    }

    let chosen: string[] = [];
    if (dish.options) {
      if (!Array.isArray(options) || options.length !== qty) return { ok: false, error: "Falta triar una opció." };
      for (const o of options) {
        if (typeof o !== "string" || !dish.options.values.includes(o)) return { ok: false, error: "Una opció no és vàlida." };
      }
      chosen = options as string[];
    } else if (options !== undefined && !(Array.isArray(options) && options.length === 0)) {
      return { ok: false, error: "Aquest plat no té opcions." };
    }

    items.push({
      dishId: dish.id,
      name: dish.name,
      unitPriceCents: dish.price,
      qty,
      options: chosen,
      subtotalCents: dish.price * qty,
    });
  }

  return { ok: true, items, totalCents: items.reduce((sum, i) => sum + i.subtotalCents, 0) };
}
