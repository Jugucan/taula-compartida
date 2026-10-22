import { allDishes, demoOrders, findDish } from "@/data/demo";

export const orderTotal = (items: { dishId: string; qty: number }[]) =>
  items.reduce((s, i) => s + (findDish(i.dishId)?.price ?? 0) * i.qty, 0);

export const ordersTotal = demoOrders.reduce((s, o) => s + orderTotal(o.items), 0);

export const consolidated = allDishes
  .map((d) => ({ dish: d, qty: demoOrders.reduce((s, o) => s + (o.items.find((i) => i.dishId === d.id)?.qty ?? 0), 0) }))
  .filter((l) => l.qty > 0);
