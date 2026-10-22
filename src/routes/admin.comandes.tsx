import { createFileRoute, Link } from "@tanstack/react-router";
import { ChevronDown, Copy, Receipt } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { AdminLayout, adminHead } from "@/components/app/AdminLayout";
import { Action, actionVariants, StatusBadge } from "@/components/app/primitives";
import { demoMeetup, demoOrders, findDish, pendingGuests } from "@/data/demo";
import { formatEuro } from "@/lib/format";
import { orderTotal, ordersTotal } from "@/lib/summary";

export const Route = createFileRoute("/admin/comandes")({
  head: () => adminHead("Seguiment de comandes", "Comandes rebudes i total acumulat."),
  component: ComandesPage,
});

function ComandesPage() {
  const [open, setOpen] = useState<string | null>(null);
  const pct = Math.round((demoMeetup.ordersReceived / demoMeetup.guests) * 100);

  return (
    <AdminLayout title={demoMeetup.name} subtitle={`${demoMeetup.restaurant} · ${demoMeetup.date}`} actions={<StatusBadge status={demoMeetup.status} />}>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-3xl border bg-card p-6">
          <p className="font-semibold text-muted-foreground">Comandes rebudes</p>
          <p className="tabular mt-1 font-display text-5xl font-semibold">{demoMeetup.ordersReceived} <span className="text-2xl text-muted-foreground">de {demoMeetup.guests}</span></p>
          <div className="mt-4 h-3 rounded-full bg-muted" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label="Progrés de comandes">
            <div className="h-3 rounded-full bg-success" style={{ width: `${pct}%` }} />
          </div>
        </div>
        <div className="rounded-3xl bg-ink p-6 text-ink-foreground">
          <p className="font-semibold opacity-75">Total acumulat</p>
          <p className="tabular mt-1 font-display text-5xl font-semibold">{formatEuro(ordersTotal)}</p>
          <Link to="/admin/resum" className={actionVariants({ size: "md", className: "mt-4" })}><Receipt className="size-5" aria-hidden /> Veure el resum</Link>
        </div>
      </div>

      <div className="mt-4 flex flex-col gap-3 rounded-3xl border bg-card p-5 sm:flex-row sm:items-center">
        <p className="flex-1 text-lg"><span className="font-bold">Enllaç per als convidats:</span> <span className="text-muted-foreground">taula.cat/t/sopar-nadal</span></p>
        <Action variant="outline" size="md" onClick={() => toast.success("Enllaç copiat (simulació)")}><Copy className="size-5" aria-hidden /> Copiar l'enllaç</Action>
      </div>

      <div className="mt-10 grid gap-8 lg:grid-cols-[1fr_18rem]">
        <section>
          <h2 className="text-2xl font-semibold">Comandes individuals</h2>
          <ul className="mt-4 divide-y rounded-3xl border bg-card">
            {demoOrders.map((o) => (
              <li key={o.id}>
                <button onClick={() => setOpen(open === o.id ? null : o.id)} aria-expanded={open === o.id} className="flex min-h-16 w-full items-center gap-4 px-5 py-3 text-left hover:bg-secondary/60">
                  <span className="grid size-10 shrink-0 place-items-center rounded-full bg-accent font-bold text-accent-foreground">{o.guest[0]}</span>
                  <span className="flex-1"><span className="block font-bold">{o.guest}</span><span className="text-sm text-muted-foreground">{o.sentAt}{o.note && " · té una nota"}</span></span>
                  <span className="tabular font-bold">{formatEuro(orderTotal(o.items))}</span>
                  <ChevronDown className={`size-5 transition ${open === o.id ? "rotate-180" : ""}`} aria-hidden />
                </button>
                {open === o.id && (
                  <div className="rise px-5 pb-5 pl-19">
                    <ul className="space-y-1 text-lg">{o.items.map((i) => <li key={i.dishId}><span className="tabular font-bold">{i.qty}×</span> {findDish(i.dishId)?.name}</li>)}</ul>
                    {o.note && <p className="mt-3 rounded-xl bg-warning-soft p-3 font-semibold text-warning">Nota: {o.note}</p>}
                  </div>
                )}
              </li>
            ))}
          </ul>
        </section>
        <aside>
          <h2 className="text-2xl font-semibold">Falten per triar</h2>
          <ul className="mt-4 space-y-2">
            {pendingGuests.map((g) => <li key={g} className="rounded-2xl border border-dashed bg-card px-4 py-3 text-lg">{g}</li>)}
          </ul>
        </aside>
      </div>
    </AdminLayout>
  );
}
