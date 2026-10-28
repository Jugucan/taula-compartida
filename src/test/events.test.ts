import { describe, expect, it } from "vitest";
import { buildEvent, canTransition, deadlinePassed, effectiveStatus, formatDeadline, formatEventDate, newPublicCode, validateNewDeadline } from "@/lib/events";
import type { StoredRestaurant } from "@/lib/restaurants";

const restaurant: StoredRestaurant = { id: "r1", name: "Prova", url: "", dishCount: 1, categories: [{ id: "primers", name: "Primers", dishes: [{ id: "a", name: "Pa", price: 450 }] }] };
const base = { name: "Sopar", dateTime: "2026-12-18T21:00", deadline: "2026-12-15", budget: "", extra: "", restaurant };

describe("buildEvent", () => {
  it("accepta una trobada correcta, en cèntims i amb còpia de la carta", () => {
    const r = buildEvent({ ...base, budget: "520,50", extra: "3" });
    expect(r.ok && r.event).toMatchObject({ name: "Sopar", budgetCents: 52050, extraCents: 300, restaurantName: "Prova", dishCount: 1 });
    expect(r.ok && r.event.menu[0]!.dishes[0]!.price).toBe(450);
  });
  it("pressupost i extra són opcionals", () => {
    const r = buildEvent(base);
    expect(r.ok && [r.event.budgetCents, r.event.extraCents]).toEqual([null, 0]);
  });
  it("rebutja dades incompletes o incoherents", () => {
    expect(buildEvent({ ...base, name: " " }).ok).toBe(false);
    expect(buildEvent({ ...base, dateTime: "" }).ok).toBe(false);
    expect(buildEvent({ ...base, deadline: "" }).ok).toBe(false);
    expect(buildEvent({ ...base, deadline: "2026-12-19" }).ok).toBe(false);
    expect(buildEvent({ ...base, budget: "molt" }).ok).toBe(false);
    expect(buildEvent({ ...base, extra: "-2" }).ok).toBe(false);
    expect(buildEvent({ ...base, restaurant: undefined }).ok).toBe(false);
    expect(buildEvent({ ...base, restaurant: { ...restaurant, dishCount: 0 } }).ok).toBe(false);
  });
  it("la data límit pot ser el mateix dia de la trobada", () => {
    expect(buildEvent({ ...base, deadline: "2026-12-18" }).ok).toBe(true);
  });
});

describe("estats", () => {
  it("només permet els canvis lògics", () => {
    expect(canTransition("draft", "open")).toBe(true);
    expect(canTransition("draft", "done")).toBe(false);
    expect(canTransition("open", "closed")).toBe(true);
    expect(canTransition("closed", "open")).toBe(true);
    expect(canTransition("done", "open")).toBe(true);
    expect(canTransition("done", "closed")).toBe(false);
  });
});

describe("codi públic i dates", () => {
  it("genera codis llargs i diferents", () => {
    const a = newPublicCode();
    expect(a).toMatch(/^[a-z2-9]{16}$/);
    expect(newPublicCode()).not.toBe(a);
  });
  it("mostra les dates en català", () => {
    expect(formatEventDate("2026-12-18T21:00")).toBe("Divendres 18 de desembre · 21:00");
    expect(formatDeadline("2026-12-15")).toBe("dimarts 15 de desembre");
  });
});


describe("tancament automàtic (hora de Catalunya)", () => {
  // A l'hivern Catalunya és UTC+1: les 23:59 locals són les 22:59 UTC.
  it("una trobada oberta es tanca sola quan acaba el dia límit", () => {
    expect(effectiveStatus("open", "2026-12-15", new Date("2026-12-15T22:59:00Z"))).toEqual({ status: "open", autoClosed: false });
    expect(effectiveStatus("open", "2026-12-15", new Date("2026-12-15T23:00:00Z"))).toEqual({ status: "closed", autoClosed: true });
  });
  it("no toca els altres estats", () => {
    expect(effectiveStatus("draft", "2020-01-01").status).toBe("draft");
    expect(effectiveStatus("closed", "2020-01-01")).toEqual({ status: "closed", autoClosed: false });
    expect(effectiveStatus("done", "2020-01-01").status).toBe("done");
  });
  it("saps si el termini ja ha passat", () => {
    expect(deadlinePassed("2026-12-15", new Date("2026-12-16T10:00:00Z"))).toBe(true);
    expect(deadlinePassed("2026-12-15", new Date("2026-12-14T10:00:00Z"))).toBe(false);
  });
  it("a l'estiu (UTC+2) el canvi de dia és a les 22:00 UTC", () => {
    expect(deadlinePassed("2026-07-15", new Date("2026-07-15T21:59:00Z"))).toBe(false);
    expect(deadlinePassed("2026-07-15", new Date("2026-07-15T22:00:00Z"))).toBe(true);
  });
});

describe("tornar a obrir amb una nova data límit", () => {
  const ara = new Date("2026-12-16T10:00:00Z");
  it("accepta una data futura anterior a la trobada", () => {
    expect(validateNewDeadline("2026-12-20", "2026-12-23T21:00", ara).ok).toBe(true);
    expect(validateNewDeadline("2026-12-16", "2026-12-23T21:00", ara).ok).toBe(true);
  });
  it("rebutja dates passades, buides o posteriors a la trobada", () => {
    expect(validateNewDeadline("2026-12-15", "2026-12-23T21:00", ara).ok).toBe(false);
    expect(validateNewDeadline("", "2026-12-23T21:00", ara).ok).toBe(false);
    expect(validateNewDeadline("2026-12-30", "2026-12-23T21:00", ara).ok).toBe(false);
  });
});
