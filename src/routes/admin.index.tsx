import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, CalendarDays, ListChecks, PlusCircle, Receipt } from "lucide-react";
import { AdminLayout, adminHead } from "@/components/app/AdminLayout";
import { StatusBadge } from "@/components/app/primitives";
import { demoMeetups } from "@/data/demo";

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
      <ul className="mt-4 divide-y rounded-3xl border bg-card">
        {demoMeetups.map((m) => (
          <li key={m.id}>
            <Link to={m.status === "draft" ? "/admin/nova" : m.status === "open" ? "/admin/comandes" : "/admin/resum"} className="flex flex-col gap-3 p-5 transition hover:bg-secondary/60 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 className="font-sans text-lg font-bold">{m.name}</h3>
                <p className="mt-1 flex items-center gap-2 text-muted-foreground"><CalendarDays className="size-4" aria-hidden /> {m.date} · {m.restaurant}</p>
              </div>
              <div className="flex items-center gap-4">
                {m.status !== "draft" && <span className="tabular text-muted-foreground">{m.ordersReceived}/{m.guests} comandes</span>}
                <StatusBadge status={m.status} />
                <ArrowRight className="hidden size-5 text-muted-foreground sm:block" aria-hidden />
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </AdminLayout>
  );
}
