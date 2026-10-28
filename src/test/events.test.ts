import { describe, expect, it } from "vitest";
import { buildEvent, canTransition, formatDeadline, formatEventDate, newPublicCode } from "@/lib/events";
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
    expect(canTransition("done", "open")).toBe(false);
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
