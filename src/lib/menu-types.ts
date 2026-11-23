// Tipus de la carta d'un restaurant. Els imports són sempre en cèntims enters.
export type Dish = {
  id: string;
  name: string;
  description?: string;
  price: number; // en cèntims (1250 = 12,50 €)
  tags?: string[];
  options?: { label: string; values: string[] }; // «a escollir» (salsa, punt de cocció…): el convidat ho escriu a la nota del plat
};

export type MenuCategory = { id: string; name: string; dishes: Dish[] };
