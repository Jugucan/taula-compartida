import { describe, expect, it } from "vitest";
import { centsToInput, parseEuroToCents } from "@/lib/money";
import { buildMenu, cleanUrl } from "@/lib/restaurants";

const draft = (name: string, price: string, category = "Primers") => ({ key: name + price, category, name, price });
let n = 0;
const id = () => `id${++n}`;

describe("diners en cèntims", () => {
  it("entén coma, punt i enters", () => {
    expect(parseEuroToCents("12,50")).toBe(1250);
    expect(parseEuroToCents("12.5")).toBe(1250);
    expect(parseEuroToCents("12")).toBe(1200);
    expect(parseEuroToCents(" 0,05 ")).toBe(5);
  });
  it("rebutja el que no és un preu", () => {
    for (const bad of ["", "abc", "-3", "1,234", "12€", "1e3"]) expect(parseEuroToCents(bad)).toBeNull();
  });
  it("torna a text editable", () => {
    expect(centsToInput(1250)).toBe("12,50");
    expect(centsToInput(5)).toBe("0,05");
  });
});

describe("buildMenu", () => {
  it("agrupa per categoria i guarda cèntims", () => {
    const r = buildMenu([draft("Canelons", "9,80"), draft("Flam", "4", "Postres"), draft("Aigua", "2,5", "Begudes")], id);
    expect(r.ok && r.categories.map((c) => c.name)).toEqual(["Primers", "Postres", "Begudes"]);
    expect(r.ok && r.categories[0]!.dishes[0]!.price).toBe(980);
    expect(r.ok && r.dishCount).toBe(3);
  });
  it("ignora files buides i exigeix almenys un plat", () => {
    expect(buildMenu([draft("", "")], id).ok).toBe(false);
    expect(buildMenu([draft("Pa", "1"), draft("", "")], id).ok).toBe(true);
  });
  it("rebutja plats sense nom o amb preu dolent", () => {
    expect(buildMenu([draft("", "5")], id).ok).toBe(false);
    expect(buildMenu([draft("Pa", "")], id).ok).toBe(false);
    expect(buildMenu([draft("Pa", "0")], id).ok).toBe(false);
    expect(buildMenu([draft("Pa", "uns 5")], id).ok).toBe(false);
  });
  it("una categoria desconeguda passa a «Altres»", () => {
    const r = buildMenu([draft("Pa", "1", "Inventada")], id);
    expect(r.ok && r.categories[0]!.name).toBe("Altres");
  });
});

describe("cleanUrl", () => {
  it("accepta buit i http(s); rebutja la resta", () => {
    expect(cleanUrl("")).toEqual({ ok: true, url: "" });
    expect(cleanUrl("https://exemple.cat/carta").ok).toBe(true);
    expect(cleanUrl("javascript:alert(1)").ok).toBe(false);
    expect(cleanUrl("no és un enllaç").ok).toBe(false);
  });
});

import { draftsFromRestaurant, type StoredRestaurant } from "@/lib/restaurants";

describe("modificar un restaurant", () => {
  const stored: StoredRestaurant = {
    id: "r1", name: "Prova", url: "", dishCount: 2,
    categories: [{ id: "primers", name: "Primers", dishes: [{ id: "abc", name: "Canelons", price: 980 }] }, { id: "postres", name: "Postres", dishes: [{ id: "def", name: "Flam", price: 400 }] }],
  };
  it("converteix la carta desada en files editables", () => {
    const drafts = draftsFromRestaurant(stored);
    expect(drafts.map((d) => [d.id, d.category, d.name, d.price])).toEqual([["abc", "Primers", "Canelons", "9,80"], ["def", "Postres", "Flam", "4,00"]]);
  });
  it("conserva l'identificador dels plats en desar els canvis i crea'n de nous només per als plats afegits", () => {
    const drafts = draftsFromRestaurant(stored);
    drafts[0]!.price = "10,00";
    drafts.push({ key: "nou", category: "Begudes", name: "Aigua", price: "2" });
    const r = buildMenu(drafts, () => "nou-id");
    const dishes = r.ok ? r.categories.flatMap((c) => c.dishes) : [];
    expect(dishes.map((d) => [d.id, d.price])).toEqual([["abc", 1000], ["def", 400], ["nou-id", 200]]);
  });
});
