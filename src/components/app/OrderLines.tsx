import type { Line } from "@/lib/guest-order";

export function OrderLines({ lines }: { lines: Line[] }) {
  return (
    <div className="rounded-2xl border bg-card p-5 text-left">
      <ul className="divide-y">
        {lines.map((l) => (
          <li key={l.dish.id} className="flex justify-between gap-4 py-3 text-lg">
            <span><span className="tabular font-bold">{l.qty}×</span> {l.dish.name}{l.options.length > 0 && <span className="mt-1 block text-base text-muted-foreground">{l.options.join(" · ")}</span>}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
