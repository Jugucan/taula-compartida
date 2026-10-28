import { beforeEach, describe, expect, it, vi } from "vitest";
import { demoMenu } from "@/data/demo";
import { createFakeDb } from "./fake-db";

let db = createFakeDb();
vi.mock("@/server/firebase-admin.server", () => ({ getDb: () => db }));

const CODE = "abcdefghjkmnpqrs";
const EVENT = "workspaces/ws1/events/ev1";
const ID1 = "aaaaaaaa-0000-0000-0000-000000000001";
const ID2 = "aaaaaaaa-0000-0000-0000-000000000002";
const T1 = "t".repeat(43);
const T2 = "u".repeat(43);
const future = "2099-12-31";

function seed(over: Record<string, unknown> = {}) {
  db = createFakeDb();
  db.store.set(`links/${CODE}`, { wsId: "ws1", eventId: "ev1" });
  db.store.set(EVENT, { name: "Sopar", restaurantName: "Prova", dateTime: "2099-12-31T21:00", deadline: future, status: "open", extraCents: 300, budgetCents: 50000, menu: demoMenu, dishCount: 3, ...over });
}
const order = (id: string, token: string, items: unknown, name = "Maria") => ({ code: CODE, orderId: id, token, guestName: name, note: "", items }) as never;

beforeEach(() => seed());

describe("fetchPublicEvent", () => {
  it("ensenya només el que toca i mai el pressupost ni identificadors interns", async () => {
    const { fetchPublicEvent } = await import("@/server/guest.server");
    const e = await fetchPublicEvent(CODE);
    expect(e).toMatchObject({ name: "Sopar", status: "open", extraCents: 300, stats: { count: 0, totalCents: 0 } });
    expect(e!.menu.length).toBeGreaterThan(0);
    const text = JSON.stringify(e);
    expect(text).not.toContain("ws1");
    expect(text).not.toContain("ev1");
    expect(text).not.toContain("budget");
    expect(text).not.toContain("50000");
  });
  it("no envia la carta si no es pot triar", async () => {
    const { fetchPublicEvent } = await import("@/server/guest.server");
    seed({ status: "draft" });
    expect((await fetchPublicEvent(CODE))!.menu).toEqual([]);
    seed({ deadline: "2020-01-01" });
    const closed = await fetchPublicEvent(CODE);
    expect(closed).toMatchObject({ status: "closed", menu: [] });
  });
  it("retorna null per enllaços desconeguts o amb format estrany", async () => {
    const { fetchPublicEvent } = await import("@/server/guest.server");
    expect(await fetchPublicEvent("zzzzzzzzzzzzzzzz")).toBeNull();
    expect(await fetchPublicEvent("../../etc")).toBeNull();
    expect(await fetchPublicEvent(undefined)).toBeNull();
  });
});

describe("saveOrder", () => {
  it("desa la comanda amb els preus de la carta i actualitza els totals", async () => {
    const { saveOrder } = await import("@/server/guest.server");
    expect(await saveOrder(order(ID1, T1, [{ dishId: "pa", qty: 2 }]))).toEqual({ ok: true });
    const saved = db.store.get(`${EVENT}/orders/${ID1}`) as Record<string, unknown>;
    expect(saved).toMatchObject({ guestName: "Maria", totalCents: 900 });
    expect(JSON.stringify(saved)).not.toContain(T1); // només es guarda el resum del codi
    expect((db.store.get(EVENT) as { stats: unknown }).stats).toEqual({ count: 1, totalCents: 900 });
  });
  it("enviar dues vegades la mateixa comanda no la duplica", async () => {
    const { saveOrder } = await import("@/server/guest.server");
    await saveOrder(order(ID1, T1, [{ dishId: "pa", qty: 2 }]));
    await saveOrder(order(ID1, T1, [{ dishId: "pa", qty: 2 }]));
    expect((db.store.get(EVENT) as { stats: unknown }).stats).toEqual({ count: 1, totalCents: 900 });
    expect([...db.store.keys()].filter((k) => k.includes("/orders/")).length).toBe(1);
  });
  it("modificar la pròpia comanda ajusta el total sense sumar una persona", async () => {
    const { saveOrder } = await import("@/server/guest.server");
    await saveOrder(order(ID1, T1, [{ dishId: "pa", qty: 2 }]));
    expect(await saveOrder(order(ID1, T1, [{ dishId: "pa", qty: 1 }]))).toEqual({ ok: true });
    expect((db.store.get(EVENT) as { stats: unknown }).stats).toEqual({ count: 1, totalCents: 450 });
  });
  it("dos convidats sumen i no es trepitgen", async () => {
    const { saveOrder } = await import("@/server/guest.server");
    await saveOrder(order(ID1, T1, [{ dishId: "pa", qty: 1 }], "Maria"));
    await saveOrder(order(ID2, T2, [{ dishId: "pa", qty: 2 }], "Pere"));
    expect((db.store.get(EVENT) as { stats: unknown }).stats).toEqual({ count: 2, totalCents: 1350 });
  });
  it("no deixa canviar la comanda d'un altre", async () => {
    const { saveOrder } = await import("@/server/guest.server");
    await saveOrder(order(ID1, T1, [{ dishId: "pa", qty: 1 }]));
    const r = await saveOrder(order(ID1, T2, [{ dishId: "pa", qty: 20 }], "Intrús"));
    expect(r.ok).toBe(false);
    expect(db.store.get(`${EVENT}/orders/${ID1}`)).toMatchObject({ guestName: "Maria", totalCents: 450 });
  });
  it("rebutja comandes quan la trobada està tancada, en esborrany o amb el termini passat", async () => {
    const { saveOrder } = await import("@/server/guest.server");
    for (const over of [{ status: "closed" }, { status: "draft" }, { status: "done" }, { deadline: "2020-01-01" }]) {
      seed(over);
      expect((await saveOrder(order(ID1, T1, [{ dishId: "pa", qty: 1 }]))).ok).toBe(false);
      expect([...db.store.keys()].some((k) => k.includes("/orders/"))).toBe(false);
    }
  });
  it("no accepta preus ni plats manipulats", async () => {
    const { saveOrder } = await import("@/server/guest.server");
    await saveOrder(order(ID1, T1, [{ dishId: "pa", qty: 1, price: 1, unitPriceCents: 1 }]));
    expect(db.store.get(`${EVENT}/orders/${ID1}`)).toMatchObject({ totalCents: 450 });
    expect((await saveOrder(order(ID2, T2, [{ dishId: "inventat", qty: 1 }]))).ok).toBe(false);
  });
  it("rebutja enllaços desconeguts", async () => {
    const { saveOrder } = await import("@/server/guest.server");
    expect((await saveOrder({ code: "zzzzzzzzzzzzzzzz", orderId: ID1, token: T1, guestName: "Maria", note: "", items: [{ dishId: "pa", qty: 1, options: [] }] })).ok).toBe(false);
  });
});

describe("fetchMyOrder", () => {
  it("només retorna la comanda amb el codi personal correcte", async () => {
    const { saveOrder, fetchMyOrder } = await import("@/server/guest.server");
    await saveOrder(order(ID1, T1, [{ dishId: "pa", qty: 2 }], "Maria"));
    expect(await fetchMyOrder(CODE, ID1, T1)).toEqual({ guestName: "Maria", note: "", items: [{ dishId: "pa", qty: 2, options: [] }] });
    expect(await fetchMyOrder(CODE, ID1, T2)).toBeNull();
    expect(await fetchMyOrder(CODE, ID2, T1)).toBeNull();
    expect(await fetchMyOrder("zzzzzzzzzzzzzzzz", ID1, T1)).toBeNull();
  });
});
