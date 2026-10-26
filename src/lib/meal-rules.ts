import { allDishes, findDish, type GuestOrder } from "@/data/demo";

export function orderTotal(items: GuestOrder["items"]) {
  return items.reduce((sum, item) => sum + (findDish(item.dishId)?.price ?? 0) * item.qty, 0);
}

export function sharedCost(orders: GuestOrder[], extra = 0) {
  const total = orders.reduce((sum, order) => sum + orderTotal(order.items), 0);
  const count = orders.length;
    return { total, count, mean: count ? Math.round(total / count) : 0, perPerson: count ? Math.round(total / count) + extra : 0 };
}

const normalize = (name: string) => name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9 ]/g, "").trim().replace(/\s+/g, " ");
export function similarNames(name: string, orders: GuestOrder[], excludeId?: string) {
  const input = normalize(name);
  if (input.length < 2) return [];
  return orders.filter(order => {
    if (order.id === excludeId) return false;
    const existing = normalize(order.guest);
    const first = existing.split(" ")[0] ?? "";
    const given = input.split(" ")[0] ?? "";
    if (existing === input || (first === given && (input === given || existing === first))) return true;
    if (input === given && (first.startsWith(input) || input.startsWith(first))) return true;
    if (given.length < 4 || first.length < 4) return false;
    let previous = Array.from({ length: first.length + 1 }, (_, j) => j);
    for (let i = 1; i <= given.length; i++) {
      const current = [i];
      for (let j = 1; j <= first.length; j++) {
        current[j] = Math.min((previous[j] ?? 0) + 1, (current[j - 1] ?? 0) + 1, (previous[j - 1] ?? 0) + (given[i - 1] === first[j - 1] ? 0 : 1));
      }
      previous = current;
    }
    return (previous[first.length] ?? Infinity) <= 1;
  });
}

export function servingDishes(orders: GuestOrder[]) {
  return allDishes.map(dish => {
    const guests = orders.flatMap(order => order.items.filter(item => item.dishId === dish.id).map(item => ({ guest: order.guest, qty: item.qty, options: item.options ?? [], note: order.note })));
    return { dish, guests, qty: guests.reduce((sum, guest) => sum + guest.qty, 0) };
  }).filter(line => line.qty > 0);
}

export function upsertOrder(orders: GuestOrder[], order: GuestOrder) {
  return [...orders.filter(existing => existing.id !== order.id), order];
}
