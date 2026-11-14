import { describe, expect, it } from "vitest";
import { demoMenu } from "@/data/demo";
import { guestNames, guestsCsv, itemNotes, noteBreakdown, optionCounts, summarize, summaryCsv } from "@/lib/order-summary";
import type { StoredOrder } from "@/lib/orders";

const item = (dishId: string, name: string, unit: number, qty: number, options: string[] = [], note = "") => ({ dishId, name, unitPriceCents: unit, qty, options, note, subtotalCents: unit * qty });
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
    expect(csv).toContain("Pa amb tomàquet;;3;4,50;13,50");
    expect(csv).toContain(";;;;Total;17,50");
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

describe("opcions i noms per plat", () => {
  const carns = [
    order("1", "Maria", [item("bistec", "Bistec", 1500, 2, ["Poc fet", "Al punt"])]),
    order("2", "Pere", [item("bistec", "Bistec", 1500, 1, ["Poc fet"])]),
  ];
  it("compta quantes unitats hi ha de cada opció", () => {
    const line = summarize(carns, demoMenu, 0).lines[0]!;
    expect(optionCounts(line)).toEqual([{ option: "Poc fet", qty: 2 }, { option: "Al punt", qty: 1 }]);
  });
  it("llista qui ha demanat cada plat", () => {
    expect(guestNames(summarize(carns, demoMenu, 0).lines[0]!)).toBe("Maria (2), Pere");
  });
  it("el CSV del resum porta les opcions", () => {
    expect(summaryCsv(summarize(carns, demoMenu, 0), "Sopar")).toContain("Bistec;Poc fet ×2 / Al punt ×1;3;15,00;45,00");
  });
});

describe("notes lliures per plat", () => {
  const ords = [
    order("1", "Maria", [item("bistec", "Bistec", 1500, 1, [], "poc fet, amb patates")]),
    order("2", "Pere", [item("bistec", "Bistec", 1500, 2, [], "un al punt i un ben fet")]),
    order("3", "Anna", [item("bistec", "Bistec", 1500, 1)]),
  ];
  it("recull les notes de cada plat amb qui les ha escrit", () => {
    const line = summarize(ords, demoMenu, 0).lines[0]!;
    expect(itemNotes(line)).toEqual([{ guest: "Maria", note: "poc fet, amb patates" }, { guest: "Pere", note: "un al punt i un ben fet" }]);
  });
  it("les notes surten al CSV del resum i al per persona", () => {
    expect(summaryCsv(summarize(ords, demoMenu, 0), "Sopar")).toContain("Bistec;1× poc fet, amb patates / 2× un al punt i un ben fet / 1× sense indicacions;4;15,00;60,00");
    expect(guestsCsv(ords)).toContain("Maria;Bistec;1;poc fet, amb patates;15,00;15,00");
  });
});

describe("notes amb el número d'unitats", () => {
  const churrasco = (qty: number, note = "") => item("churrasco", "Churrasco", 1800, qty, [], note);
  it("3 churrascos i una sola nota: «1× poc fet» i «2× sense indicacions»", () => {
    const line = summarize([order("1", "Maria", [churrasco(1, "poc fet")]), order("2", "Pere", [churrasco(1)]), order("3", "Anna", [churrasco(1)])], demoMenu, 0).lines[0]!;
    expect(noteBreakdown(line)).toEqual([
      { label: "poc fet", qty: 1, guests: ["Maria"] },
      { label: "sense indicacions", qty: 2, guests: ["Pere", "Anna"] },
    ]);
  });
  it("suma les notes iguals encara que canviïn les majúscules o els espais", () => {
    const line = summarize([order("1", "Maria", [churrasco(1, "Poc fet")]), order("2", "Pere", [churrasco(2, " poc  fet ")])], demoMenu, 0).lines[0]!;
    expect(noteBreakdown(line)).toEqual([{ label: "Poc fet", qty: 3, guests: ["Maria", "Pere"] }]);
  });
  it("una nota d'una comanda de diverses unitats compta totes les unitats d'aquella persona", () => {
    const line = summarize([order("1", "Pere", [churrasco(2, "un al punt i un ben fet")]), order("2", "Anna", [churrasco(1, "poc fet")])], demoMenu, 0).lines[0]!;
    expect(noteBreakdown(line).map((g) => `${g.qty}× ${g.label}`)).toEqual(["2× un al punt i un ben fet", "1× poc fet"]);
  });
  it("si ningú ha escrit cap nota, no s'afegeix res", () => {
    const line = summarize([order("1", "Maria", [churrasco(1)]), order("2", "Pere", [churrasco(2)])], demoMenu, 0).lines[0]!;
    expect(noteBreakdown(line)).toEqual([]);
  });
});
