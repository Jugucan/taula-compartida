import { formatEuro } from "@/lib/format";
import type { Dish } from "@/data/demo";

export function OrderLines({ lines, total }: { lines: { dish: Dish; qty: number }[]; total: number }) {
  return (
    <div className="rounded-2xl border bg-card p-5 text-left">
      <ul className="divide-y">
        {lines.map((l) => (
          <li key={l.dish.id} className="flex justify-between gap-4 py-3 text-lg">
            <span><span className="tabular font-bold">{l.qty}×</span> {l.dish.name}</span>
            <span className="tabular">{formatEuro(l.qty * l.dish.price)}</span>
          </li>
        ))}
      </ul>
      <div className="mt-2 flex justify-between border-t-2 border-foreground/80 pt-4 text-xl font-bold">
        <span>Total</span><span className="tabular">{formatEuro(total)}</span>
      </div>
    </div>
  );
}
