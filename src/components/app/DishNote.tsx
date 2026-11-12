import type { Dish } from "@/data/demo";
import { choicesText } from "@/lib/guest-checks";
import { useGuest } from "@/lib/guest-order";
import { cn } from "@/lib/utils";

// Una nota lliure per a cada plat: salsa, punt de cocció, acompanyament, intoleràncies…
// Si el plat s'ha d'escollir (salsa, punt…), es destaca i no es pot deixar en blanc.
export function DishNote({ dish, qty, invalid = false }: { dish: Dish; qty: number; invalid?: boolean }) {
  const { dishNotes, setDishNote } = useGuest();
  const id = `nota-${dish.id}`;
  const choices = choicesText(dish);
  return (
    <div className="mt-4">
      {choices && (
        <p className={cn("mb-3 rounded-xl px-4 py-3 text-lg font-bold", invalid ? "bg-destructive-soft text-destructive" : "bg-primary-soft text-primary")}>
          {choices}
        </p>
      )}
      <label htmlFor={id} className="block font-semibold">{choices ? "Escriu què vols escollir" : "Vols afegir alguna cosa?"}</label>
      {qty > 1 && <p className="text-sm text-muted-foreground">Si en demanes més d'un, explica què vols a cadascun.</p>}
      <input id={id} value={dishNotes[dish.id] ?? ""} maxLength={120} placeholder="Salses, punt de cocció, acompanyament…"
        aria-invalid={invalid} onChange={(e) => setDishNote(dish.id, e.target.value)}
        className={cn("mt-2 min-h-12 w-full rounded-lg border-2 bg-background px-3 text-base outline-none focus:border-primary", invalid ? "border-destructive" : "border-input")} />
      {invalid && <p role="alert" className="mt-2 font-semibold text-destructive">Falta escollir aquí.</p>}
    </div>
  );
}
