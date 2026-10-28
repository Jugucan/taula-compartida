import { describe, expect, it } from "vitest";
import { demoMenu } from "@/data/demo";
import { decideSubmit } from "@/lib/order-submit";

const ID = "11111111-2222-3333-4444-555555555555";
const TOKEN = "a".repeat(43);
const event = { status: "open" as const, deadline: "2026-12-15", menu: demoMenu, orderCount: 3 };
const input = { orderId: ID, token: TOKEN, guestName: "  Maria   Puig ", note: "", items: [{ dishId: "pa", qty: 2 }] };
const now = new Date("2026-12-10T10:00:00Z");

describe("decideSubmit", () => {
  it("crea una comanda nova amb preus de la carta i nom net", () => {
    const r = decideSubmit({ event, existing: null, input, now });
    expect(r).toMatchObject({ ok: true, action: "create", deltaCount: 1, deltaTotalCents: 900 });
    expect(r.ok && r.order.guestName).toBe("Maria Puig");
  });
  it("si ja existeix i el codi coincideix, l'actualitza (no la duplica)", () => {
    const r = decideSubmit({ event, existing: { totalCents: 450, tokenMatches: true }, input, now });
    expect(r).toMatchObject({ ok: true, action: "update", deltaCount: 0, deltaTotalCents: 450 });
  });
  it("un reintent idèntic no canvia els totals", () => {
    const r = decideSubmit({ event, existing: { totalCents: 900, tokenMatches: true }, input, now });
    expect(r).toMatchObject({ ok: true, action: "update", deltaCount: 0, deltaTotalCents: 0 });
  });
  it("rebutja canviar la comanda d'un altre (codi diferent)", () => {
    expect(decideSubmit({ event, existing: { totalCents: 450, tokenMatches: false }, input, now }).ok).toBe(false);
  });
  it("rebutja si la trobada no està oberta o el termini ha passat", () => {
    for (const status of ["draft", "closed", "done"] as const) expect(decideSubmit({ event: { ...event, status }, existing: null, input, now }).ok).toBe(false);
    expect(decideSubmit({ event, existing: null, input, now: new Date("2026-12-15T23:00:00Z") }).ok).toBe(false);
    expect(decideSubmit({ event, existing: null, input, now: new Date("2026-12-15T22:00:00Z") }).ok).toBe(true);
  });
  it("rebutja noms, notes i identificadors no vàlids", () => {
    expect(decideSubmit({ event, existing: null, input: { ...input, guestName: "M" }, now }).ok).toBe(false);
    expect(decideSubmit({ event, existing: null, input: { ...input, guestName: "x".repeat(61) }, now }).ok).toBe(false);
    expect(decideSubmit({ event, existing: null, input: { ...input, note: "x".repeat(301) }, now }).ok).toBe(false);
    expect(decideSubmit({ event, existing: null, input: { ...input, orderId: "../hack" }, now }).ok).toBe(false);
    expect(decideSubmit({ event, existing: null, input: { ...input, token: "curt" }, now }).ok).toBe(false);
  });
  it("ignora preus manipulats i rebutja plats inexistents", () => {
    const manipulated = { ...input, items: [{ dishId: "pa", qty: 1, price: 1, unitPriceCents: 1, totalCents: 1 }] };
    expect(decideSubmit({ event, existing: null, input: manipulated, now })).toMatchObject({ ok: true, deltaTotalCents: 450 });
    expect(decideSubmit({ event, existing: null, input: { ...input, items: [{ dishId: "no", qty: 1 }] }, now }).ok).toBe(false);
  });
  it("posa un límit de comandes per trobada", () => {
    expect(decideSubmit({ event: { ...event, orderCount: 300 }, existing: null, input, now }).ok).toBe(false);
    expect(decideSubmit({ event: { ...event, orderCount: 300 }, existing: { totalCents: 1, tokenMatches: true }, input, now }).ok).toBe(true);
  });
});
