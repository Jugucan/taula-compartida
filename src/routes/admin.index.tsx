import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, CalendarDays, ListChecks, PlusCircle, Receipt } from "lucide-react";
import { AdminLayout, adminHead } from "@/components/app/AdminLayout";
import { StatusBadge } from "@/components/app/primitives";
import { useAdminUid } from "@/components/app/AdminGate";
import { effectiveStatus, formatEventDate } from "@/lib/events";
import { useEvents } from "@/lib/use-events";

export const Route = createFileRoute("/admin/")({
  head: () => adminHead("Inici", "Les teves trobades i les accions principals."),
  component: AdminHome,
});

const actions = [
  { to: "/admin/nova", label: "Crear una trobada", text: "Nom, data i restaurant", icon: PlusCircle, primary: true },
  { to: "/admin/comandes", label: "Gestionar les comandes", text: "Qui ha triat i qui no", icon: ListChecks },
  { to: "/admin/resum", label: "Veure els resums", text: "Pressupost i llista per al restaurant", icon: Receipt },
] as const;

function AdminHome() {
  return (
    <AdminLayout title="Bon dia, Laia" subtitle="Què vols fer avui?">
      <div className="grid gap-4 md:grid-cols-3">
        {actions.map((a) => (
          <Link key={a.to} to={a.to} className={`group rise flex min-h-36 flex-col justify-between rounded-3xl p-6 shadow-soft transition hover:shadow-lift ${"primary" in a ? "bg-primary text-primary-foreground" : "border bg-card"}`}>
            <a.icon className="size-8" aria-hidden />
            <div>
              <h2 className="mt-4 font-sans text-xl font-bold">{a.label}</h2>
              <p className="mt-1 opacity-80">{a.text}</p>
            </div>
          </Link>
        ))}
      </div>

      <h2 className="mt-12 text-2xl font-semibold">Trobades recents</h2>
      <RecentEvents />
    </AdminLayout>
  );
}

function RecentEvents() {
  const uid = useAdminUid();
  const { data: events, isLoading, isError } = useEvents(uid);

  if (isLoading) return <p className="mt-4 text-lg text-muted-foreground">Carregant les teves trobades…</p>;
  if (isError) return <p role="alert" className="mt-4 rounded-2xl bg-destructive-soft p-4 text-destructive">No s'han pogut carregar les trobades. Torna-ho a provar d'aquí una estona.</p>;
  if (!events || events.length === 0) {
    return <p className="mt-4 rounded-3xl border bg-card p-6 text-lg text-muted-foreground">Encara no has creat cap trobada. Comença amb «Crear una trobada».</p>;
  }
  return (
    <ul className="mt-4 divide-y rounded-3xl border bg-card">
      {events.map((m) => (
        <li key={m.id}>
          <Link to="/admin/trobada/$id" params={{ id: m.id }} className="flex flex-col gap-3 p-5 transition hover:bg-secondary/60 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="font-sans text-lg font-bold">{m.name}</h3>
              <p className="mt-1 flex items-center gap-2 text-muted-foreground"><CalendarDays className="size-4" aria-hidden /> {formatEventDate(m.dateTime)} · {m.restaurantName}</p>
            </div>
            <div className="flex items-center gap-4">
              <StatusBadge status={effectiveStatus(m.status, m.deadline).status} />
              <ArrowRight className="hidden size-5 text-muted-foreground sm:block" aria-hidden />
            </div>
          </Link>
        </li>
      ))}
    </ul>
  );
}
