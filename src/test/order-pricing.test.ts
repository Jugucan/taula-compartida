import { describe, expect, it } from "vitest";
import { demoMenu } from "@/data/demo";
import { priceOrder } from "@/lib/order-pricing";

const withOptions = demoMenu.flatMap((c) => c.dishes).find((d) => d.options)!;

describe("priceOrder", () => {
  it("calcula els imports a partir de la carta, en cèntims", () => {
    const result = priceOrder(demoMenu, [{ dishId: "pa", qty: 2 }]);
    expect(result).toMatchObject({ ok: true, totalCents: 900 });
  });

  it("ignora qualsevol preu enviat pel navegador", () => {
    const result = priceOrder(demoMenu, [{ dishId: "pa", qty: 1, price: 1, unitPriceCents: 1 }]);
    expect(result).toMatchObject({ ok: true, totalCents: 450 });
  });

  it("rebutja plats inexistents, quantitats dolentes i comandes buides", () => {
    expect(priceOrder(demoMenu, [{ dishId: "no-existeix", qty: 1 }]).ok).toBe(false);
    expect(priceOrder(demoMenu, [{ dishId: "pa", qty: 0 }]).ok).toBe(false);
    expect(priceOrder(demoMenu, [{ dishId: "pa", qty: 1.5 }]).ok).toBe(false);
    expect(priceOrder(demoMenu, [{ dishId: "pa", qty: 999 }]).ok).toBe(false);
    expect(priceOrder(demoMenu, []).ok).toBe(false);
    expect(priceOrder(demoMenu, "res").ok).toBe(false);
  });

  it("rebutja plats repetits", () => {
    expect(priceOrder(demoMenu, [{ dishId: "pa", qty: 1 }, { dishId: "pa", qty: 1 }]).ok).toBe(false);
  });

  it("les opcions antigues són opcionals i, si arriben, es comproven", () => {
    const first = withOptions.options!.values[0]!;
    expect(priceOrder(demoMenu, [{ dishId: withOptions.id, qty: 2 }]).ok).toBe(true);
    expect(priceOrder(demoMenu, [{ dishId: withOptions.id, qty: 2, options: [first] }]).ok).toBe(false);
    expect(priceOrder(demoMenu, [{ dishId: withOptions.id, qty: 2, options: [first, "inventada"] }]).ok).toBe(false);
    expect(priceOrder(demoMenu, [{ dishId: withOptions.id, qty: 2, options: [first, first] }]).ok).toBe(true);
    expect(priceOrder(demoMenu, [{ dishId: "pa", qty: 1, options: ["res"] }]).ok).toBe(false);
  });
  it("guarda la nota lliure de cada plat, neta d'espais, i en limita la mida", () => {
    const r = priceOrder(demoMenu, [{ dishId: "pa", qty: 2, note: "  poc fet   i amb  patates " }]);
    expect(r.ok && r.items[0]!.note).toBe("poc fet i amb patates");
    expect(priceOrder(demoMenu, [{ dishId: "pa", qty: 1 }]).ok && true).toBe(true);
    expect(priceOrder(demoMenu, [{ dishId: "pa", qty: 1, note: "x".repeat(121) }]).ok).toBe(false);
    expect(priceOrder(demoMenu, [{ dishId: "pa", qty: 1, note: 5 }]).ok).toBe(false);
  });
});
