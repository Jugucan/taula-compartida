import type { Dish } from "@/data/demo";
import { useGuest } from "@/lib/guest-order";

// Una nota lliure per a cada plat: punt de cocció, salsa, acompanyament, intoleràncies…
export function DishNote({ dish, qty }: { dish: Dish; qty: number }) {
  const { dishNotes, setDishNote } = useGuest();
  const id = `nota-${dish.id}`;
  return (
    <div className="mt-4">
      <label htmlFor={id} className="block font-semibold">Vols afegir alguna cosa?</label>
      <p className="text-sm text-muted-foreground">
        Punt de cocció, salsa, acompanyament, intoleràncies…{qty > 1 ? " Si en demanes més d'un, explica què vols a cadascun." : ""}
        {dish.options ? ` Opcions: ${dish.options.label.toLowerCase()} (${dish.options.values.join(", ")}).` : ""}
      </p>
      <input id={id} value={dishNotes[dish.id] ?? ""} maxLength={120} placeholder="Per exemple: poc fet i amb patates"
        onChange={(e) => setDishNote(dish.id, e.target.value)}
        className="mt-2 min-h-12 w-full rounded-lg border-2 border-input bg-background px-3 text-base outline-none focus:border-primary" />
    </div>
  );
}
