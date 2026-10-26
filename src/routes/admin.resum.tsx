import { createFileRoute } from "@tanstack/react-router";
import { Printer } from "lucide-react";
import { AdminLayout, adminHead } from "@/components/app/AdminLayout";
import { Action } from "@/components/app/primitives";
import { demoMeetup, demoMenu } from "@/data/demo";
import { formatEuro } from "@/lib/format";
import { servingDishes } from "@/lib/meal-rules";
import { useOrder } from "@/lib/order-store";

export const Route = createFileRoute("/admin/resum")({
  head: () => adminHead("Pressupost i resum", "Pressupost de la trobada i resum per al restaurant."),
  component: ResumPage,
});

function ResumPage() {
  const { orders, cost, extra, setExtra } = useOrder();
  const ordersTotal = cost.total;
  const consolidated = servingDishes(orders);
  const budget = demoMeetup.budget ?? 0;
  const diff = budget - ordersTotal;
  const pct = Math.min(100, Math.round((ordersTotal / budget) * 100));

  return (
    <AdminLayout title="Pressupost i resum" subtitle={demoMeetup.name}
      actions={<Action variant="ink" size="md" className="no-print" onClick={() => window.print()}><Printer className="size-5" aria-hidden /> Imprimir el resum</Action>}>
      <section className="no-print mb-8 border-y py-6">
        <h2 className="text-2xl font-semibold">Import compartit</h2>
        <div className="mt-5 grid gap-6 sm:grid-cols-2">
          <div><label htmlFor="extra" className="block text-lg font-bold">Extra fix per persona (€)</label><input id="extra" type="number" min="0" step="0.50" value={extra / 100} onChange={e => setExtra(Number(e.target.value))} className="mt-2 min-h-14 w-full rounded-lg border-2 border-input bg-card px-4 text-lg focus:border-primary" /><p className="mt-2 text-sm text-muted-foreground">Reserva per a begudes i complements.</p></div>
          <dl className="space-y-2"><div className="flex justify-between gap-4"><dt>Mitjana de {cost.count} comandes</dt><dd className="tabular font-bold">{formatEuro(cost.mean)}</dd></div><div className="flex justify-between gap-4"><dt>Extra per persona</dt><dd className="tabular font-bold">{formatEuro(extra)}</dd></div><div className="flex justify-between gap-4 border-t pt-3 text-xl"><dt className="font-bold">Per persona</dt><dd className="tabular font-bold text-primary" aria-live="polite">{formatEuro(cost.perPerson)}</dd></div></dl>
        </div>
      </section>
      {budget > 0 && (
        <section className="no-print rounded-3xl border bg-card p-6">
          <h2 className="text-xl font-semibold">Pressupost</h2>
          <div className="mt-4 h-4 rounded-full bg-muted"><div className={`h-4 rounded-full ${diff >= 0 ? "bg-success" : "bg-destructive"}`} style={{ width: `${pct}%` }} /></div>
          <dl className="mt-5 grid gap-4 sm:grid-cols-3">
            <div><dt className="text-muted-foreground">Pressupost màxim</dt><dd className="tabular text-2xl font-bold">{formatEuro(budget)}</dd></div>
            <div><dt className="text-muted-foreground">Import de les comandes</dt><dd className="tabular text-2xl font-bold">{formatEuro(ordersTotal)}</dd></div>
            <div><dt className="text-muted-foreground">{diff >= 0 ? "Encara queda" : "T'has passat"}</dt><dd className={`tabular text-2xl font-bold ${diff >= 0 ? "text-success" : "text-destructive"}`}>{formatEuro(Math.abs(diff))} {diff >= 0 ? "✓" : "!"}</dd></div>
          </dl>
        </section>
      )}

      <article className="mt-8 rounded-3xl border bg-card p-6 md:p-10">
        <header className="border-b-2 border-foreground/80 pb-4">
          <p className="text-sm font-bold uppercase tracking-widest text-muted-foreground">Comanda per a {demoMeetup.restaurant}</p>
          <h2 className="mt-1 text-2xl font-semibold">{demoMeetup.name}</h2>
          <p className="text-lg text-muted-foreground">{demoMeetup.date} · {orders.length} persones</p>
        </header>
        {demoMenu.map((cat) => {
          const lines = consolidated.filter((l) => cat.dishes.some((d) => d.id === l.dish.id));
          if (!lines.length) return null;
          return (
            <section key={cat.id} className="mt-6">
              <h3 className="font-sans text-sm font-bold uppercase tracking-widest text-primary">{cat.name}</h3>
              <ul className="mt-2 divide-y">
                {lines.map((l) => (
                  <li key={l.dish.id} className="flex justify-between gap-4 py-2.5 text-lg">
                    <span><span className="tabular inline-block w-10 font-bold">{l.qty}×</span>{l.dish.name}{l.guests.some(g => g.options.length > 0) && <span className="block text-base text-muted-foreground">{l.guests.filter(g => g.options.length > 0).map(g => `${g.guest}: ${g.options.join(", ")}`).join(" · ")}</span>}</span>
                    <span className="tabular text-muted-foreground">{formatEuro(l.qty * l.dish.price)}</span>
                  </li>
                ))}
              </ul>
            </section>
          );
        })}
        <div className="mt-6 flex justify-between border-t-2 border-foreground/80 pt-4 text-xl font-bold"><span>Total</span><span className="tabular">{formatEuro(ordersTotal)}</span></div>
        <p className="mt-3 text-lg">Import compartit: <span className="tabular font-bold">{formatEuro(cost.perPerson)}</span> per persona (inclou {formatEuro(extra)} d'extres).</p>
        {orders.filter(o => o.note).map(o => <p key={o.id} className="mt-3 rounded-lg bg-warning-soft p-3 font-semibold text-warning">{o.guest} — {o.note}</p>)}
      </article>
    </AdminLayout>
  );
}
