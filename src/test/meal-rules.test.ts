import { describe, expect, it } from "vitest";
import { sharedCost, similarNames, servingDishes, upsertOrder } from "@/lib/meal-rules";
import type { GuestOrder } from "@/data/demo";

const orders: GuestOrder[] = [
  { id: "susanna", guest: "Susanna", sentAt: "ara", items: [{ dishId: "pasta", qty: 2, options: ["Pesto", "Bolonyesa"] }] },
  { id: "jordi", guest: "Jordi", sentAt: "ara", items: [{ dishId: "filet", qty: 1, options: ["Poc fet"] }] },
];
describe("Shared meal rules", () => {
  it("divides submitted totals by submitted guests, not expected attendees", () => {
    expect(sharedCost(orders).perPerson).toBe(2500);
  });
  it("adds the fixed extra to each person's mean", () => {
    expect(sharedCost(orders, 500).perPerson).toBe(3000);
  });
  it("handles no submitted orders without division by zero", () => {
    expect(sharedCost([], 500)).toEqual({ total: 0, count: 0, mean: 0, perPerson: 0 });
  });
  it("offers Susanna when Su returns without silently changing an order", () => {
    expect(similarNames("Su", orders).map(o => o.id)).toEqual(["susanna"]);
    expect(orders[0]?.guest).toBe("Susanna");
  });
  it("excludes the current order from duplicate-name suggestions", () => {
    expect(similarNames("Susanna", orders, "susanna")).toEqual([]);
  });
  it("keeps unrelated names separate", () => {
    expect(similarNames("Maria", orders)).toEqual([]);
  });
  it("updates a recovered order without adding another diner", () => {
    const updated = upsertOrder(orders, { id: "susanna", guest: "Susanna", sentAt: "ara", items: [{ dishId: "pasta", qty: 1, options: ["Tomàquet"] }] });
    expect(updated).toHaveLength(2);
    expect(sharedCost(updated).perPerson).toBe(1800);
  });
  it("preserves each serving's sauce and meat doneness with the diner's name", () => {
    const dishes = servingDishes(orders);
    expect(dishes.find(l => l.dish.id === "pasta")?.guests).toEqual([{ guest: "Susanna", qty: 2, options: ["Pesto", "Bolonyesa"], note: undefined }]);
    expect(dishes.find(l => l.dish.id === "filet")?.guests[0]?.options).toEqual(["Poc fet"]);
  });
});
