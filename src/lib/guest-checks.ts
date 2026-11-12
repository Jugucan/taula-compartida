// Petites comprovacions i textos per als plats «a escollir» (salsa, punt de cocció…), a la carta dels convidats.
import type { Dish } from "@/data/demo";

/** «A escollir: carbonara / bolonyesa / pesto», o null si el plat no té res a escollir. */
export function choicesText(dish: { name?: string; options?: Dish["options"] }): string | null {
  const values = dish.options?.values;
  if (!values || values.length === 0) return null;
  return `A escollir: ${values.map((v) => v.toLocaleLowerCase("ca")).join(" / ")}`;
}

/** Noms dels plats triats que exigeixen escollir alguna cosa i encara no tenen cap nota. */
export function missingChoices(lines: { dish: { name: string; options?: Dish["options"] }; note: string }[]): string[] {
  return lines.filter((l) => l.dish.options && l.dish.options.values.length > 0 && !l.note.trim()).map((l) => l.dish.name);
}
