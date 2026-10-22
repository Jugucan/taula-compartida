// DEMO DATA ONLY — replace with real data sources during implementation.

export type Dish = {
  id: string;
  name: string;
  description?: string;
  price: number;
  tags?: string[];
};

export type MenuCategory = { id: string; name: string; dishes: Dish[] };

export type MeetupStatus = "draft" | "open" | "closed" | "done";

export type Meetup = {
  id: string;
  name: string;
  restaurant: string;
  date: string;
  deadline: string;
  status: MeetupStatus;
  guests: number;
  ordersReceived: number;
  budget?: number;
};

export const demoMeetup: Meetup = {
  id: "sopar-nadal",
  name: "Sopar de Nadal de la colla",
  restaurant: "Can Rovira",
  date: "Divendres 18 de desembre · 21:00",
  deadline: "dimarts 15 de desembre",
  status: "open",
  guests: 16,
  ordersReceived: 11,
  budget: 520,
};

export const demoMenu: MenuCategory[] = [
  {
    id: "entrants",
    name: "Entrants",
    dishes: [
      { id: "pa", name: "Pa amb tomàquet", description: "Pa de pagès torrat amb oli d'Arbequina", price: 4.5, tags: ["Vegà"] },
      { id: "croquetes", name: "Croquetes de rostit", description: "Sis unitats, fetes a casa", price: 9 },
      { id: "escalivada", name: "Escalivada amb formatge de cabra", price: 11.5, tags: ["Vegetarià"] },
      { id: "amanida", name: "Amanida de temporada", description: "Fulles tendres, magrana i nous", price: 10 },
    ],
  },
  {
    id: "principals",
    name: "Plats principals",
    dishes: [
      { id: "canelons", name: "Canelons de la iaia", description: "Amb beixamel gratinada", price: 14 },
      { id: "bacalla", name: "Bacallà a la llauna", description: "Amb mongetes del ganxet", price: 19.5 },
      { id: "galta", name: "Galta de vedella al vi negre", description: "Cocció lenta, puré de patata", price: 18 },
      { id: "arros", name: "Arròs de verdures", description: "Per a una persona", price: 15, tags: ["Vegà"] },
    ],
  },
  {
    id: "postres",
    name: "Postres",
    dishes: [
      { id: "crema", name: "Crema catalana", price: 6 },
      { id: "music", name: "Postres de músic", description: "Fruits secs i moscatell", price: 6.5 },
      { id: "torrons", name: "Plat de torrons", price: 5.5 },
    ],
  },
  {
    id: "begudes",
    name: "Begudes",
    dishes: [
      { id: "aigua", name: "Aigua mineral", price: 2.5 },
      { id: "vi", name: "Copa de vi negre (DO Montsant)", price: 4.5 },
      { id: "cava", name: "Copa de cava", price: 5 },
      { id: "refresc", name: "Refresc", price: 3 },
    ],
  },
];

export const allDishes = demoMenu.flatMap((c) => c.dishes);
export const findDish = (id: string) => allDishes.find((d) => d.id === id);

export const demoMeetups: Meetup[] = [
  demoMeetup,
  { id: "aniversari-marta", name: "Aniversari de la Marta", restaurant: "La Fonda del Port", date: "Dissabte 9 de gener · 14:00", deadline: "5 de gener", status: "draft", guests: 0, ordersReceived: 0 },
  { id: "dinar-equip", name: "Dinar d'equip del trimestre", restaurant: "Bistrot Gràcia", date: "Dijous 26 de novembre · 13:30", deadline: "23 de novembre", status: "closed", guests: 22, ordersReceived: 22, budget: 600 },
  { id: "retrobada-80", name: "Retrobada promoció del 80", restaurant: "Can Rovira", date: "Dissabte 17 d'octubre · 21:00", deadline: "12 d'octubre", status: "done", guests: 34, ordersReceived: 31 },
];

export type GuestOrder = { id: string; guest: string; items: { dishId: string; qty: number }[]; note?: string; sentAt: string };

export const demoOrders: GuestOrder[] = [
  { id: "o1", guest: "Montse Ribas", sentAt: "fa 2 h", items: [{ dishId: "pa", qty: 1 }, { dishId: "canelons", qty: 1 }, { dishId: "crema", qty: 1 }, { dishId: "vi", qty: 2 }] },
  { id: "o2", guest: "Jordi Puig", sentAt: "fa 3 h", items: [{ dishId: "croquetes", qty: 1 }, { dishId: "galta", qty: 1 }, { dishId: "cava", qty: 1 }] },
  { id: "o3", guest: "Pilar Soler", sentAt: "ahir", note: "Sense gluten, si us plau", items: [{ dishId: "amanida", qty: 1 }, { dishId: "bacalla", qty: 1 }, { dishId: "aigua", qty: 1 }] },
  { id: "o4", guest: "Ramon Vidal", sentAt: "ahir", items: [{ dishId: "pa", qty: 1 }, { dishId: "galta", qty: 1 }, { dishId: "music", qty: 1 }, { dishId: "vi", qty: 2 }] },
  { id: "o5", guest: "Anna Ferrer", sentAt: "ahir", items: [{ dishId: "escalivada", qty: 1 }, { dishId: "arros", qty: 1 }, { dishId: "refresc", qty: 1 }] },
  { id: "o6", guest: "Pere Casals", sentAt: "fa 2 dies", items: [{ dishId: "croquetes", qty: 1 }, { dishId: "canelons", qty: 1 }, { dishId: "torrons", qty: 1 }, { dishId: "vi", qty: 1 }] },
  { id: "o7", guest: "Núria Bosch", sentAt: "fa 2 dies", items: [{ dishId: "pa", qty: 1 }, { dishId: "bacalla", qty: 1 }, { dishId: "crema", qty: 1 }, { dishId: "cava", qty: 1 }] },
  { id: "o8", guest: "Lluís Mas", sentAt: "fa 3 dies", items: [{ dishId: "amanida", qty: 1 }, { dishId: "galta", qty: 1 }, { dishId: "aigua", qty: 1 }] },
  { id: "o9", guest: "Teresa Roca", sentAt: "fa 3 dies", items: [{ dishId: "escalivada", qty: 1 }, { dishId: "canelons", qty: 1 }, { dishId: "music", qty: 1 }] },
  { id: "o10", guest: "Josep Font", sentAt: "fa 4 dies", items: [{ dishId: "croquetes", qty: 2 }, { dishId: "galta", qty: 1 }, { dishId: "vi", qty: 2 }] },
  { id: "o11", guest: "Carme Serra", sentAt: "fa 4 dies", items: [{ dishId: "pa", qty: 1 }, { dishId: "arros", qty: 1 }, { dishId: "crema", qty: 1 }, { dishId: "aigua", qty: 1 }] },
];

export const pendingGuests = ["Xavier Pons", "Rosa Martí", "Enric Valls", "Marina Coll", "Albert Prat"];

export type Restaurant = { id: string; name: string; area: string; dishes: number; lastUsed?: string };

export const demoRestaurants: Restaurant[] = [
  { id: "can-rovira", name: "Can Rovira", area: "Vic", dishes: 15, lastUsed: "Fa 2 mesos" },
  { id: "fonda-port", name: "La Fonda del Port", area: "Vilanova i la Geltrú", dishes: 22 },
  { id: "bistrot", name: "Bistrot Gràcia", area: "Barcelona", dishes: 18, lastUsed: "Fa 1 mes" },
];

export type ImportedDish = { id: string; name: string; price: number | null; category: string; doubt?: string | undefined };

export const demoImported: ImportedDish[] = [
  { id: "i1", name: "Esqueixada de bacallà", price: 12, category: "Entrants" },
  { id: "i2", name: "Calçots amb romesco", price: 14.5, category: "Entrants" },
  { id: "i3", name: "Fideuà del Port", price: null, category: "Principals", doubt: "No hem trobat el preu" },
  { id: "i4", name: "Suquet de peix", price: 21, category: "Principals" },
  { id: "i5", name: "Botifarra amb mongetes", price: 13, category: "Principals" },
  { id: "i6", name: "Mató amb mel", price: 55, category: "Postres", doubt: "Preu poc habitual: revisa'l" },
];
