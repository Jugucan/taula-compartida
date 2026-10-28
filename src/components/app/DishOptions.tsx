import type { Dish } from "@/data/demo";
import { useGuest } from "@/lib/guest-order";

export function DishOptions({ dish, qty }: { dish: Dish; qty: number }) {
  const { selections, setOption } = useGuest();
  if (!dish.options || qty < 1) return null;
  const options = dish.options;
  return <div className="mt-4 grid gap-3">
    {Array.from({ length: qty }, (_, index) => <label key={index} className="flex flex-wrap items-center justify-between gap-2 font-semibold">
      <span>{options.label}{qty > 1 ? ` · plat ${index + 1}` : ""}</span>
      <select aria-label={`${options.label} de ${dish.name}, plat ${index + 1}`} value={selections[dish.id]?.[index] ?? options.values[0]} onChange={e => setOption(dish.id, index, e.target.value)} className="min-h-12 max-w-full rounded-lg border-2 border-input bg-background px-3 text-base focus:border-primary">
        {options.values.map(option => <option key={option}>{option}</option>)}
      </select>
    </label>)}
  </div>;
}
