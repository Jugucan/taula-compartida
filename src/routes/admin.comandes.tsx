import { createFileRoute, Link } from "@tanstack/react-router";
import { ChevronDown, Copy, Receipt, RefreshCw, Search, Users, UtensilsCrossed } from "lucide-react";
import { useState } from "react";
import { AdminLayout, adminHead } from "@/components/app/AdminLayout";
import { EventPicker, NoEvents, useSelectedEvent } from "@/components/app/EventPicker";
import { Action, actionVariants, StatusBadge } from "@/components/app/primitives";
import { effectiveStatus, formatEventDate, type StoredEvent } from "@/lib/events";
import { formatEuro, plural } from "@/lib/format";
import { summarize } from "@/lib/order-summary";
import type { StoredOrder } from "@/lib/orders";
import { useOrders } from "@/lib/use-orders";

export const Route = createFileRoute("/admin/comandes")({
  validateSearch: (search: Record<string, unknown>): { t?: string } => (typeof search["t"] === "string" ? { t: search["t"] } : {}),
  head: () => adminHead("Seguiment de comandes", "Comandes rebudes i total acumulat."),
  component: ComandesPage,
});

const sentAt = (d: Date | null) => (d ? new Intl.DateTimeFormat("ca", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }).format(d) : "");

function ComandesPage() {
  const { t } = Route.useSearch();
  return (
    <AdminLayout title="Seguiment de comandes" subtitle="Les comandes que van arribant dels convidats.">
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
      <EventPicker events={events} selected={event.id} to="/admin/comandes" />
      <Orders uid={uid} event={event} />
    </>
  );
}

function Orders({ uid, event }: { uid: string; event: StoredEvent }) {
  const [open, setOpen] = useState<string | null>(null);
  const [view, setView] = useState<"guests" | "dishes">("guests");
  const [search, setSearch] = useState("");
  const [copied, setCopied] = useState(false);
  const { data: orders = [], isPending, isError, isFetching, refetch } = useOrders(uid, event.id);
  const summary = summarize(orders, event.menu, event.extraCents);
  const dishes = summary.lines.filter((l) => l.name.toLocaleLowerCase().includes(search.toLocaleLowerCase()));
  const link = `${window.location.origin}/t/${event.publicCode}`;
  const shown = effectiveStatus(event.status, event.deadline).status;

  async function copy() {
    try { await navigator.clipboard.writeText(link); setCopied(true); setTimeout(() => setCopied(false), 2500); } catch { /* L'enllaç és visible: es pot copiar a mà. */ }
  }

  return (
    <>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-semibold">{event.name}</h2>
          <p className="text-lg text-muted-foreground">{event.restaurantName} · {formatEventDate(event.dateTime)}</p>
        </div>
        <StatusBadge status={shown} />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-3xl border bg-card p-6">
          <p className="font-semibold text-muted-foreground">Comandes rebudes</p>
          <p className="tabular mt-1 font-display text-5xl font-semibold">{summary.count}</p>
          <p className="mt-3 text-muted-foreground">{summary.count === 1 ? "persona ha triat" : "persones han triat"}</p>
        </div>
        <div className="rounded-3xl bg-ink p-6 text-ink-foreground">
          <p className="font-semibold opacity-75">Total acumulat</p>
          <p className="tabular mt-1 font-display text-5xl font-semibold">{formatEuro(summary.totalCents)}</p>
          <p className="mt-3 text-lg">{summary.count ? `${formatEuro(summary.perPersonCents)} per persona${event.extraCents > 0 ? " · extres inclosos" : ""}` : "Encara no hi ha comandes"}</p>
          <Link to="/admin/resum" search={{ t: event.id }} className={actionVariants({ size: "md", className: "mt-4" })}><Receipt className="size-5" aria-hidden /> Veure el resum</Link>
        </div>
      </div>

      <div className="mt-4 flex flex-col gap-3 rounded-3xl border bg-card p-5 sm:flex-row sm:items-center">
        <p className="min-w-0 flex-1 break-all text-lg"><span className="font-bold">Enllaç per als convidats:</span> <span className="text-muted-foreground">{link}</span></p>
        <Action variant="outline" size="md" onClick={copy}><Copy className="size-5" aria-hidden /> {copied ? "Copiat!" : "Copiar l'enllaç"}</Action>
      </div>

      <section className="mt-10">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap gap-2" role="group" aria-label="Vista de comandes">
            <Action size="md" variant={view === "guests" ? "ink" : "outline"} aria-pressed={view === "guests"} onClick={() => setView("guests")}><Users className="size-5" aria-hidden /> Per persona</Action>
            <Action size="md" variant={view === "dishes" ? "ink" : "outline"} aria-pressed={view === "dishes"} onClick={() => setView("dishes")}><UtensilsCrossed className="size-5" aria-hidden /> Per plat</Action>
          </div>
          <Action size="md" variant="soft" onClick={() => refetch()} disabled={isFetching}><RefreshCw className={`size-5 ${isFetching ? "animate-spin" : ""}`} aria-hidden /> {isFetching ? "Actualitzant…" : "Actualitzar"}</Action>
        </div>

        {isPending && <p className="mt-6 text-lg text-muted-foreground">Carregant les comandes…</p>}
        {isError && <p role="alert" className="mt-6 rounded-2xl bg-destructive-soft p-4 text-destructive">No s'han pogut carregar les comandes. Prem «Actualitzar» per tornar-ho a provar.</p>}
        {!isPending && !isError && orders.length === 0 && (
          <p className="mt-6 rounded-3xl border bg-card p-6 text-lg text-muted-foreground">Encara no ha arribat cap comanda. Comparteix l'enllaç amb els convidats{shown === "open" ? "." : " i obre les comandes perquè puguin triar."}</p>
        )}

        {orders.length > 0 && view === "dishes" && (
          <div className="mt-5">
            <label className="flex items-center gap-3 rounded-lg border-2 border-input bg-card px-4"><Search className="size-5 shrink-0 text-muted-foreground" aria-hidden /><input aria-label="Buscar un plat" placeholder="Buscar un plat" value={search} onChange={(e) => setSearch(e.target.value)} className="min-h-12 w-full bg-transparent outline-none" /></label>
            <ul className="mt-4 space-y-4">{dishes.map((line) => (
              <li key={line.key} className="rounded-lg border bg-card p-5">
                <h3 className="flex items-start justify-between gap-3 font-sans text-xl font-semibold"><span>{line.name}</span><span className="tabular shrink-0 text-primary">{line.qty}×</span></h3>
                <ul className="mt-3 divide-y">{line.guests.map((g, i) => (
                  <li key={i} className="py-3"><p className="text-lg font-bold">{g.guest} <span className="tabular font-normal text-muted-foreground">· {g.qty}×</span></p>{g.options.length > 0 && <p className="text-primary">{g.options.join(" · ")}</p>}{g.note && <p className="mt-1 font-semibold text-warning">{g.note}</p>}</li>
                ))}</ul>
              </li>
            ))}</ul>
            {dishes.length === 0 && <p role="status" className="py-8 text-muted-foreground">Cap plat coincideix amb la cerca.</p>}
          </div>
        )}

        {orders.length > 0 && view === "guests" && (
          <ul className="mt-4 divide-y rounded-3xl border bg-card">
            {orders.map((o: StoredOrder) => {
              const total = o.items.reduce((s, i) => s + i.unitPriceCents * i.qty, 0);
              return (
                <li key={o.id}>
                  <Action variant="ghost" size="md" onClick={() => setOpen(open === o.id ? null : o.id)} aria-expanded={open === o.id} className="min-h-16 w-full justify-start gap-4 rounded-none px-5 py-3 text-left hover:bg-secondary/60">
                    <span className="grid size-10 shrink-0 place-items-center rounded-full bg-accent font-bold text-accent-foreground">{o.guestName[0]?.toUpperCase()}</span>
                    <span className="flex-1"><span className="block font-bold">{o.guestName}</span><span className="text-sm text-muted-foreground">{plural(o.items.reduce((s, i) => s + i.qty, 0), "plat", "plats")} · {sentAt(o.createdAt)}{o.note && " · té una nota"}</span></span>
                    <span className="tabular font-bold">{formatEuro(total)}</span>
                    <ChevronDown className={`size-5 transition ${open === o.id ? "rotate-180" : ""}`} aria-hidden />
                  </Action>
                  {open === o.id && (
                    <div className="rise px-5 pb-5 pl-19">
                      <ul className="space-y-1 text-lg">{o.items.map((i) => <li key={i.dishId}><span className="tabular font-bold">{i.qty}×</span> {i.name}{i.options?.length ? <span className="block text-base text-primary">{i.options.join(" · ")}</span> : null}</li>)}</ul>
                      {o.note && <p className="mt-3 rounded-xl bg-warning-soft p-3 font-semibold text-warning">Nota: {o.note}</p>}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </>
  );
}
