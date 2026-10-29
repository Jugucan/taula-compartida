import { describe, expect, it } from "vitest";
import { demoMenu } from "@/data/demo";
import { guestsCsv, summarize, summaryCsv } from "@/lib/order-summary";
import type { StoredOrder } from "@/lib/orders";

const item = (dishId: string, name: string, unit: number, qty: number, options: string[] = []) => ({ dishId, name, unitPriceCents: unit, qty, options, subtotalCents: unit * qty });
const order = (id: string, guestName: string, items: ReturnType<typeof item>[], note = ""): StoredOrder => ({ id, guestName, note, items, totalCents: 0, createdAt: null });

const orders = [
  order("1", "Maria", [item("pa", "Pa amb tomàquet", 450, 2), item("flam", "Flam", 400, 1)], "Sense gluten"),
  order("2", "Pere", [item("pa", "Pa amb tomàquet", 450, 1)]),
];

describe("summarize", () => {
  it("suma plats, totals i mitjana en cèntims", () => {
    const s = summarize(orders, demoMenu, 300);
    expect(s.count).toBe(2);
    expect(s.totalCents).toBe(450 * 3 + 400);
    expect(s.meanCents).toBe(875);
    expect(s.perPersonCents).toBe(1175);
    expect(s.lines.find((l) => l.dishId === "pa")).toMatchObject({ qty: 3, subtotalCents: 1350 });
  });
  it("el total del resum coincideix amb la suma de les comandes", () => {
    const s = summarize(orders, demoMenu, 0);
    expect(s.lines.reduce((sum, l) => sum + l.subtotalCents, 0)).toBe(s.totalCents);
  });
  it("conserva els preus històrics: un canvi de preu crea una línia a part", () => {
    const s = summarize([...orders, order("3", "Anna", [item("pa", "Pa amb tomàquet", 500, 1)])], demoMenu, 0);
    const pa = s.lines.filter((l) => l.dishId === "pa");
    expect(pa.map((l) => [l.unitPriceCents, l.qty])).toEqual([[450, 3], [500, 1]]);
    expect(s.totalCents).toBe(1350 + 400 + 500);
  });
  it("sense comandes tot és zero", () => {
    expect(summarize([], demoMenu, 300)).toMatchObject({ count: 0, totalCents: 0, perPersonCents: 0, lines: [] });
  });
  it("agrupa per categoria i recull les notes", () => {
    const s = summarize(orders, demoMenu, 0);
    expect(s.byCategory.length).toBeGreaterThan(0);
    expect(s.notes).toEqual([{ guest: "Maria", note: "Sense gluten" }]);
  });
  it("un plat que ja no és a la carta es mostra a «Altres»", () => {
    const s = summarize([order("9", "Joan", [item("esborrat", "Plat antic", 1000, 1)])], demoMenu, 0);
    expect(s.byCategory.at(-1)).toMatchObject({ name: "Altres" });
  });
});

describe("CSV", () => {
  it("usa ; i decimals amb coma, i té BOM per a Excel", () => {
    const csv = summaryCsv(summarize(orders, demoMenu, 0), "Sopar");
    expect(csv.startsWith("\uFEFF")).toBe(true);
    expect(csv).toContain("Pa amb tomàquet;3;4,50;13,50");
    expect(csv).toContain(";;;Total;17,50");
  });
  it("protegeix contra fórmules i cometes en els noms dels convidats", () => {
    const csv = guestsCsv([order("1", '=HYPERLINK("x")', [item("pa", "Pa", 450, 1)], 'nota; "amb cometes"')]);
    expect(csv).toContain("'=HYPERLINK");
    expect(csv).toContain('"nota; ""amb cometes"""');
    expect(csv).not.toMatch(/(^|\r\n)=/);
  });
  it("el CSV per persona només posa la nota i el total una vegada per comanda", () => {
    const lines = guestsCsv(orders).trim().split("\r\n");
    expect(lines).toHaveLength(1 + 3);
    expect(lines[1]).toContain("Sense gluten");
    expect(lines[2]).not.toContain("Sense gluten");
  });
});
