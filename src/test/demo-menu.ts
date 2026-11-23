// Carta d'exemple, només per a les proves automàtiques.
import type { MenuCategory } from "@/lib/menu-types";

const demoMenuEuros: MenuCategory[] = [
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
      { id: "pasta", name: "Pasta fresca", description: "Amb la salsa que més t'agradi", price: 14, options: { label: "Salsa", values: ["Pesto", "Bolonyesa", "Tomàquet"] } },
      { id: "filet", name: "Filet de vedella", price: 22, options: { label: "Punt de cocció", values: ["Al punt", "Poc fet", "Ben fet"] } },
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

   // Els preus de dalt estan en euros per comoditat; aquí es converteixen a cèntims enters.
   export const demoMenu: MenuCategory[] = demoMenuEuros.map((c) => ({
     ...c,
     dishes: c.dishes.map((d) => ({ ...d, price: Math.round(d.price * 100) })),
   }));
