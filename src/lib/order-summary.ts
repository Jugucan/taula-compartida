// Resum consolidat de les comandes: totals, plats, i exportació a CSV. Lògica pura, en cèntims.
import type { MenuCategory } from "@/data/demo";
import type { StoredOrder } from "@/lib/orders";

export type DishGuest = { guest: string; qty: number; options: string[]; note: string };
export type DishLine = { key: string; dishId: string; name: string; category: string; unitPriceCents: number; qty: number; subtotalCents: number; guests: DishGuest[] };
export type Summary = {
  count: number;
  totalCents: number;
  meanCents: number;
  perPersonCents: number;
  lines: DishLine[];
  byCategory: { name: string; lines: DishLine[] }[];
  notes: { guest: string; note: string }[];
};

/** Els totals es calculen sempre a partir dels plats de cada comanda (preus del moment de la comanda). */
export function summarize(orders: StoredOrder[], menu: MenuCategory[], extraCents: number): Summary {
  const categoryOf = new Map(menu.flatMap((c) => c.dishes.map((d) => [d.id, c.name] as const)));
  const lines = new Map<string, DishLine>();
  let totalCents = 0;

  for (const order of orders) {
    for (const item of order.items) {
      const subtotal = item.unitPriceCents * item.qty;
      totalCents += subtotal;
      const key = `${item.dishId}|${item.unitPriceCents}`; // un canvi de preu entre comandes es veu com una línia a part
      const line = lines.get(key) ?? { key, dishId: item.dishId, name: item.name, category: categoryOf.get(item.dishId) ?? "Altres", unitPriceCents: item.unitPriceCents, qty: 0, subtotalCents: 0, guests: [] };
      line.qty += item.qty;
      line.subtotalCents += subtotal;
      line.guests.push({ guest: order.guestName, qty: item.qty, options: item.options ?? [], note: order.note });
      lines.set(key, line);
    }
  }

  const count = orders.length;
  const meanCents = count ? Math.round(totalCents / count) : 0;
  const order = menu.map((c) => c.name);
  const names = [...new Set([...order, ...[...lines.values()].map((l) => l.category)])];
  const all = [...lines.values()];
  const byCategory = names
    .map((name) => ({ name, lines: all.filter((l) => l.category === name) }))
    .filter((c) => c.lines.length > 0);

  return {
    count, totalCents, meanCents,
    perPersonCents: count ? meanCents + extraCents : 0,
    lines: byCategory.flatMap((c) => c.lines),
    byCategory,
    notes: orders.filter((o) => o.note.trim()).map((o) => ({ guest: o.guestName, note: o.note })),
  };
}

// ---------- CSV (pensat per obrir-lo amb Excel en català: separador «;» i decimals amb coma) ----------

const money = (cents: number) => (cents / 100).toFixed(2).replace(".", ",");

function cell(value: string | number): string {
  let text = String(value);
  // Evita que un nom escrit per un convidat s'executi com a fórmula en obrir el fitxer.
  if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`;
  return /[";\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}
const row = (cells: (string | number)[]) => cells.map(cell).join(";");
const finish = (rows: string[]) => "\uFEFF" + rows.join("\r\n") + "\r\n";

export function summaryCsv(summary: Summary, eventName: string): string {
  return finish([
    row(["Trobada", eventName]),
    row(["Comandes", summary.count]),
    "",
    row(["Categoria", "Plat", "Quantitat", "Preu unitari (€)", "Subtotal (€)"]),
    ...summary.lines.map((l) => row([l.category, l.name, l.qty, money(l.unitPriceCents), money(l.subtotalCents)])),
    row(["", "", "", "Total", money(summary.totalCents)]),
  ]);
}

export function guestsCsv(orders: StoredOrder[]): string {
  const rows: string[] = [row(["Convidat", "Plat", "Quantitat", "Opcions", "Preu unitari (€)", "Subtotal (€)", "Nota", "Total de la comanda (€)"])];
  for (const o of orders) {
    o.items.forEach((i, index) => rows.push(row([o.guestName, i.name, i.qty, (i.options ?? []).join(" / "), money(i.unitPriceCents), money(i.unitPriceCents * i.qty), index === 0 ? o.note : "", index === 0 ? money(o.items.reduce((s, x) => s + x.unitPriceCents * x.qty, 0)) : ""])));
  }
  return finish(rows);
}
