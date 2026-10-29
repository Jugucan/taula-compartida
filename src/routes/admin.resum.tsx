import { createFileRoute, Link } from "@tanstack/react-router";
import { Download, Printer } from "lucide-react";
import { AdminLayout, adminHead } from "@/components/app/AdminLayout";
import { EventPicker, NoEvents, useSelectedEvent } from "@/components/app/EventPicker";
import { Action } from "@/components/app/primitives";
import { formatEventDate, type StoredEvent } from "@/lib/events";
import { formatEuro, plural } from "@/lib/format";
import { guestsCsv, summarize, summaryCsv } from "@/lib/order-summary";
import { useOrders } from "@/lib/use-orders";

export const Route = createFileRoute("/admin/resum")({
  validateSearch: (search: Record<string, unknown>): { t?: string } => (typeof search["t"] === "string" ? { t: search["t"] } : {}),
  head: () => adminHead("Pressupost i resum", "Pressupost de la trobada i resum per al restaurant."),
  component: ResumPage,
});

function download(filename: string, content: string) {
  const url = URL.createObjectURL(new Blob([content], { type: "text/csv;charset=utf-8" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
const fileName = (name: string, kind: string) => `${name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "trobada"}-${kind}.csv`;

function ResumPage() {
  const { t } = Route.useSearch();
  return (
    <AdminLayout title="Pressupost i resum" subtitle="El resum per enviar al restaurant.">
      <Content t={t} />
    </AdminLayout>
  );
}

function Content({ t }: { t: string | undefined }) {
  const { uid, event, events, loading, error } = useSelectedEvent(t);
  if (loading) return <p className="text-lg text-muted-foreground">Carregant…</p>;
  if (error) return <p role="alert" className="rounded-2xl bg-destructive-soft p-4 text-destructive">No s'han pogut carregar les trobades. Torna-ho a provar d'aquí una estona.</p>;
  if (!event) return <NoEvents />;
  return (
    <>
      <EventPicker events={events} selected={event.id} to="/admin/resum" />
      <Resum uid={uid} event={event} />
    </>
  );
}

function Resum({ uid, event }: { uid: string; event: StoredEvent }) {
  const { data: orders = [], isPending, isError } = useOrders(uid, event.id);
  const s = summarize(orders, event.menu, event.extraCents);
  const budget = event.budgetCents ?? 0;
  const diff = budget - s.totalCents;
  const pct = budget > 0 ? Math.min(100, Math.round((s.totalCents / budget) * 100)) : 0;

  if (isPending) return <p className="text-lg text-muted-foreground">Carregant les comandes…</p>;
  if (isError) return <p role="alert" className="rounded-2xl bg-destructive-soft p-4 text-destructive">No s'han pogut carregar les comandes. Torna-ho a provar d'aquí una estona.</p>;

  return (
    <>
      <div className="no-print mb-6 flex flex-wrap gap-3">
        <Action variant="ink" size="md" onClick={() => window.print()}><Printer className="size-5" aria-hidden /> Imprimir o desar en PDF</Action>
        <Action variant="outline" size="md" disabled={orders.length === 0} onClick={() => download(fileName(event.name, "resum"), summaryCsv(s, event.name))}><Download className="size-5" aria-hidden /> CSV del resum</Action>
        <Action variant="outline" size="md" disabled={orders.length === 0} onClick={() => download(fileName(event.name, "per-persona"), guestsCsv(orders))}><Download className="size-5" aria-hidden /> CSV per persona</Action>
      </div>

      <section className="no-print mb-8 border-y py-6">
        <h2 className="text-2xl font-semibold">Import compartit</h2>
        <dl className="mt-5 max-w-md space-y-2">
          <div className="flex justify-between gap-4"><dt>Mitjana de {plural(s.count, "comanda", "comandes")}</dt><dd className="tabular font-bold">{formatEuro(s.meanCents)}</dd></div>
          <div className="flex justify-between gap-4"><dt>Extra per persona</dt><dd className="tabular font-bold">{formatEuro(event.extraCents)}</dd></div>
          <div className="flex justify-between gap-4 border-t pt-3 text-xl"><dt className="font-bold">Per persona</dt><dd className="tabular font-bold text-primary" aria-live="polite">{formatEuro(s.perPersonCents)}</dd></div>
        </dl>
        <p className="mt-3 text-sm text-muted-foreground">L'extra es canva a <Link to="/admin/editar-trobada/$id" params={{ id: event.id }} className="font-semibold text-primary underline">Modificar la trobada</Link>.</p>
      </section>

      {budget > 0 && (
        <section className="no-print rounded-3xl border bg-card p-6">
          <h2 className="text-xl font-semibold">Pressupost</h2>
          <div className="mt-4 h-4 rounded-full bg-muted"><div className={`h-4 rounded-full ${diff >= 0 ? "bg-success" : "bg-destructive"}`} style={{ width: `${pct}%` }} /></div>
          <dl className="mt-5 grid gap-4 sm:grid-cols-3">
            <div><dt className="text-muted-foreground">Pressupost màxim</dt><dd className="tabular text-2xl font-bold">{formatEuro(budget)}</dd></div>
            <div><dt className="text-muted-foreground">Import de les comandes</dt><dd className="tabular text-2xl font-bold">{formatEuro(s.totalCents)}</dd></div>
            <div><dt className="text-muted-foreground">{diff >= 0 ? "Encara queda" : "T'has passat"}</dt><dd className={`tabular text-2xl font-bold ${diff >= 0 ? "text-success" : "text-destructive"}`}>{formatEuro(Math.abs(diff))} {diff >= 0 ? "✓" : "!"}</dd></div>
          </dl>
        </section>
      )}

      <article className="mt-8 rounded-3xl border bg-card p-6 md:p-10">
        <header className="border-b-2 border-foreground/80 pb-4">
          <p className="text-sm font-bold uppercase tracking-widest text-muted-foreground">Comanda per a {event.restaurantName}</p>
          <h2 className="mt-1 text-2xl font-semibold">{event.name}</h2>
          <p className="text-lg text-muted-foreground">{formatEventDate(event.dateTime)} · {plural(s.count, "persona", "persones")}</p>
        </header>
        {s.count === 0 && <p className="mt-6 text-lg text-muted-foreground">Encara no hi ha cap comanda confirmada.</p>}
        {s.byCategory.map((cat) => (
          <section key={cat.name} className="mt-6">
            <h3 className="font-sans text-sm font-bold uppercase tracking-widest text-primary">{cat.name}</h3>
            <ul className="mt-2 divide-y">
              {cat.lines.map((l) => {
                const withOptions = l.guests.filter((g) => g.options.length > 0);
                return (
                  <li key={l.key} className="flex justify-between gap-4 py-2.5 text-lg">
                    <span><span className="tabular inline-block w-10 font-bold">{l.qty}×</span>{l.name} <span className="tabular text-base text-muted-foreground">({formatEuro(l.unitPriceCents)} c/u)</span>{withOptions.length > 0 && <span className="block text-base text-muted-foreground">{withOptions.map((g) => `${g.guest}: ${g.options.join(", ")}`).join(" · ")}</span>}</span>
                    <span className="tabular text-muted-foreground">{formatEuro(l.subtotalCents)}</span>
                  </li>
                );
              })}
            </ul>
          </section>
        ))}
        <div className="mt-6 flex justify-between border-t-2 border-foreground/80 pt-4 text-xl font-bold"><span>Total</span><span className="tabular">{formatEuro(s.totalCents)}</span></div>
        {s.count > 0 && <p className="mt-3 text-lg">Import compartit: <span className="tabular font-bold">{formatEuro(s.perPersonCents)}</span> per persona{event.extraCents > 0 && ` (inclou ${formatEuro(event.extraCents)} d'extres)`}.</p>}
        {s.notes.map((n, i) => <p key={i} className="mt-3 rounded-lg bg-warning-soft p-3 font-semibold text-warning">{n.guest} — {n.note}</p>)}
      </article>
    </>
  );
}
