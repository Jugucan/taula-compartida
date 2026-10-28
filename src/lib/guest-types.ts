// Dades que el servidor ensenya als convidats. NO inclou mai pressupost, identificadors interns ni comandes d'altres persones.
import type { MenuCategory } from "@/data/demo";
import type { EventStatus } from "@/lib/event-time";

export type PublicEvent = {
  name: string;
  restaurantName: string;
  dateTime: string;
  deadline: string;
  status: EventStatus; // estat real, tenint en compte el termini
  extraCents: number;
  menu: MenuCategory[]; // només quan les comandes estan obertes
  stats: { count: number; totalCents: number }; // per a l'import compartit estimat
};

export type MyOrder = { guestName: string; note: string; items: { dishId: string; qty: number; options: string[] }[] };

export type SendOrderInput = { code: string; orderId: string; token: string; guestName: string; note: string; items: { dishId: string; qty: number; options: string[] }[] };
export type SendOrderResult = { ok: true } | { ok: false; error: string };
