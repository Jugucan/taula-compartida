import { createFileRoute, Link } from "@tanstack/react-router";
import { ChevronDown, Copy, Receipt, Users, UtensilsCrossed, Search } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { AdminLayout, adminHead } from "@/components/app/AdminLayout";
import { Action, actionVariants, StatusBadge } from "@/components/app/primitives";
import { demoMeetup, findDish, pendingGuests } from "@/data/demo";
import { formatEuro } from "@/lib/format";
import { orderTotal, servingDishes } from "@/lib/meal-rules";
import { useOrder } from "@/lib/order-store";

export const Route = createFileRoute("/admin/comandes")({
  head: () => adminHead("Seguiment de comandes", "Comandes rebudes i total acumulat."),
  component: ComandesPage,
});

function ComandesPage() {
  const [open, setOpen] = useState<string | null>(null);
  const [view, setView] = useState<"guests" | "dishes">("guests");
  const [search, setSearch] = useState("");
  const { orders, cost } = useOrder();
  const pct = Math.min(100, Math.round((orders.length / demoMeetup.guests) * 100));
  const dishes = servingDishes(orders).filter(line => line.dish.name.toLocaleLowerCase().includes(search.toLocaleLowerCase()));

  return (
    <AdminLayout title={demoMeetup.name} subtitle={`${demoMeetup.restaurant} · ${demoMeetup.date}`} actions={<StatusBadge status={demoMeetup.status} />}>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-3xl border bg-card p-6">
          <p className="font-semibold text-muted-foreground">Comandes rebudes</p>
          <p className="tabular mt-1 font-display text-5xl font-semibold">{orders.length} <span className="text-2xl text-muted-foreground">de {Math.max(demoMeetup.guests, orders.length)}</span></p>
          <div className="mt-4 h-3 rounded-full bg-muted" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label="Progrés de comandes">
            <div className="h-3 rounded-full bg-success" style={{ width: `${pct}%` }} />
          </div>
        </div>
        <div className="rounded-3xl bg-ink p-6 text-ink-foreground">
          <p className="font-semibold opacity-75">Total acumulat</p>
          <p className="tabular mt-1 font-display text-5xl font-semibold">{formatEuro(cost.total)}</p>
          <p className="mt-3 text-lg">{formatEuro(cost.perPerson)} per persona · extres inclosos</p>
          <Link to="/admin/resum" className={actionVariants({ size: "md", className: "mt-4" })}><Receipt className="size-5" aria-hidden /> Veure el resum</Link>
        </div>
      </div>

      <div className="mt-4 flex flex-col gap-3 rounded-3xl border bg-card p-5 sm:flex-row sm:items-center">
        <p className="flex-1 text-lg"><span className="font-bold">Enllaç per als convidats:</span> <span className="text-muted-foreground">taula.cat/t/sopar-nadal</span></p>
        <Action variant="outline" size="md" onClick={() => toast.success("Enllaç copiat (simulació)")}><Copy className="size-5" aria-hidden /> Copiar l'enllaç</Action>
      </div>

      <div className="mt-10 grid gap-8 lg:grid-cols-[1fr_18rem]">
        <section>
          <div className="flex flex-wrap gap-2" role="group" aria-label="Vista de comandes">
            <Action size="md" variant={view === "guests" ? "ink" : "outline"} aria-pressed={view === "guests"} onClick={() => setView("guests")}><Users className="size-5" aria-hidden /> Per persona</Action>
            <Action size="md" variant={view === "dishes" ? "ink" : "outline"} aria-pressed={view === "dishes"} onClick={() => setView("dishes")}><UtensilsCrossed className="size-5" aria-hidden /> Per plat</Action>
          </div>
          {view === "dishes" ? <div className="mt-5">
            <label className="flex items-center gap-3 rounded-lg border-2 border-input bg-card px-4"><Search className="size-5 shrink-0 text-muted-foreground" aria-hidden /><input aria-label="Buscar un plat" placeholder="Buscar un plat" value={search} onChange={e => setSearch(e.target.value)} className="min-h-12 w-full bg-transparent outline-none" /></label>
            <ul className="mt-4 space-y-4">{dishes.map(line => <li key={line.dish.id} className="rounded-lg border bg-card p-5">
              <h2 className="flex items-start justify-between gap-3 text-xl font-semibold"><span>{line.dish.name}</span><span className="tabular shrink-0 text-primary">{line.qty}×</span></h2>
              <ul className="mt-3 divide-y">{line.guests.map((guest, index) => <li key={index} className="py-3"><p className="text-lg font-bold">{guest.guest} <span className="tabular font-normal text-muted-foreground">· {guest.qty}×</span></p>{guest.options.length > 0 && <p className="text-primary">{guest.options.join(" · ")}</p>}{guest.note && <p className="mt-1 font-semibold text-warning">{guest.note}</p>}</li>)}</ul>
            </li>)}</ul>
            {dishes.length === 0 && <p role="status" className="py-8 text-muted-foreground">Cap plat coincideix amb la cerca.</p>}
          </div> : <ul className="mt-4 divide-y rounded-3xl border bg-card">
            {orders.map((o) => (
              <li key={o.id}>
                <Action variant="ghost" size="md" onClick={() => setOpen(open === o.id ? null : o.id)} aria-expanded={open === o.id} className="min-h-16 w-full justify-start gap-4 rounded-none px-5 py-3 text-left hover:bg-secondary/60">
                  <span className="grid size-10 shrink-0 place-items-center rounded-full bg-accent font-bold text-accent-foreground">{o.guest[0]}</span>
                  <span className="flex-1"><span className="block font-bold">{o.guest}</span><span className="text-sm text-muted-foreground">{o.sentAt}{o.note && " · té una nota"}</span></span>
                  <span className="tabular font-bold">{formatEuro(orderTotal(o.items))}</span>
                  <ChevronDown className={`size-5 transition ${open === o.id ? "rotate-180" : ""}`} aria-hidden />
                </Action>
                {open === o.id && (
                  <div className="rise px-5 pb-5 pl-19">
                    <ul className="space-y-1 text-lg">{o.items.map((i) => <li key={i.dishId}><span className="tabular font-bold">{i.qty}×</span> {findDish(i.dishId)?.name}{i.options?.length ? <span className="block text-base text-primary">{i.options.join(" · ")}</span> : null}</li>)}</ul>
                    {o.note && <p className="mt-3 rounded-xl bg-warning-soft p-3 font-semibold text-warning">Nota: {o.note}</p>}
                  </div>
                )}
              </li>
            ))}
          </ul>}
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
