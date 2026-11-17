import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { AdminLayout, adminHead } from "@/components/app/AdminLayout";
import { useAdminUid } from "@/components/app/AdminGate";
import { Action } from "@/components/app/primitives";
import { approveRequest, listOrganizers, listRequests, rejectRequest, requestsOpen, setOrganizerStatus, setRequestsOpen, type Organizer, type OrganizerRequest } from "@/lib/access";
import { isSuperAdmin } from "@/lib/access-config";

export const Route = createFileRoute("/admin/organitzadors")({
  head: () => adminHead("Organitzadors", "Qui pot tenir un compte d'organitzador."),
  component: OrganitzadorsPage,
});

const date = (d: Date | null) => (d ? new Intl.DateTimeFormat("ca", { day: "numeric", month: "short", year: "numeric" }).format(d) : "");

function OrganitzadorsPage() {
  return (
    <AdminLayout title="Organitzadors" subtitle="Tu decideixes qui pot tenir un compte d'organitzador.">
      <Content />
    </AdminLayout>
  );
}

function Content() {
  const uid = useAdminUid();
  if (!isSuperAdmin(uid)) return <p role="alert" className="rounded-2xl bg-warning-soft p-5 text-lg font-semibold text-warning">Només l'administradora principal pot veure aquesta pàgina.</p>;
  return <Manager />;
}

function Manager() {
  const qc = useQueryClient();
  const [error, setError] = useState("");
  const open = useQuery({ queryKey: ["access", "open"], queryFn: requestsOpen, staleTime: 60_000 });
  const requests = useQuery({ queryKey: ["access", "requests"], queryFn: listRequests, staleTime: 60_000 });
  const organizers = useQuery({ queryKey: ["access", "organizers"], queryFn: listOrganizers, staleTime: 60_000 });

  const refresh = () => qc.invalidateQueries({ queryKey: ["access"] });
  const run = useMutation({
    mutationFn: (fn: () => Promise<void>) => fn(),
    onSuccess: () => { setError(""); return refresh(); },
    onError: () => setError("No s'ha pogut fer el canvi. Torna-ho a provar."),
  });

  return (
    <div className="space-y-8">
      <section className="rounded-3xl border bg-card p-6">
        <h2 className="text-xl font-semibold">Noves sol·licituds</h2>
        <p className="mt-2 text-lg text-muted-foreground">
          {open.data ? "Ara mateix s'accepten sol·licituds: a la pantalla d'entrada surt «Demana accés»." : "Ara mateix no s'accepten sol·licituds: només hi entren els organitzadors que tu has aprovat."}
        </p>
        <div className="mt-4">
          <Action variant={open.data ? "outline" : "ink"} size="md" disabled={run.isPending || open.isPending} onClick={() => run.mutate(() => setRequestsOpen(!open.data))}>
            {open.data ? "Tancar les sol·licituds" : "Obrir les sol·licituds"}
          </Action>
        </div>
      </section>

      {error && <p role="alert" className="rounded-2xl bg-destructive-soft p-4 font-semibold text-destructive">{error}</p>}

      <section className="rounded-3xl border bg-card p-6">
        <h2 className="text-xl font-semibold">Sol·licituds pendents</h2>
        {requests.isPending && <p className="mt-3 text-muted-foreground">Carregant…</p>}
        {requests.isError && <p role="alert" className="mt-3 text-destructive">No s'han pogut carregar les sol·licituds.</p>}
        {requests.data?.length === 0 && <p className="mt-3 text-lg text-muted-foreground">No n'hi ha cap.</p>}
        <ul className="mt-3 divide-y">
          {(requests.data ?? []).map((r: OrganizerRequest) => (
            <li key={r.uid} className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between">
              <div><p className="text-lg font-bold">{r.email}</p><p className="text-muted-foreground">Demanat el {date(r.createdAt)}</p></div>
              <div className="flex gap-3">
                <Action size="md" disabled={run.isPending} onClick={() => run.mutate(() => approveRequest(r))}>Aprovar</Action>
                <Action size="md" variant="outline" disabled={run.isPending} onClick={() => run.mutate(() => rejectRequest(r.uid))}>Rebutjar</Action>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section className="rounded-3xl border bg-card p-6">
        <h2 className="text-xl font-semibold">Organitzadors</h2>
        <p className="mt-2 text-muted-foreground">Un organitzador suspès no pot entrar, però les seves dades es conserven.</p>
        {organizers.isPending && <p className="mt-3 text-muted-foreground">Carregant…</p>}
        {organizers.isError && <p role="alert" className="mt-3 text-destructive">No s'han pogut carregar els organitzadors.</p>}
        {organizers.data?.length === 0 && <p className="mt-3 text-lg text-muted-foreground">Encara no n'hi ha cap més a part de tu.</p>}
        <ul className="mt-3 divide-y">
          {(organizers.data ?? []).map((o: Organizer) => (
            <li key={o.uid} className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-lg font-bold">{o.email}</p>
                <p className={o.status === "active" ? "text-success" : "text-warning"}>{o.status === "active" ? "Actiu" : "Suspès"} · des del {date(o.createdAt)}</p>
              </div>
              <Action size="md" variant="outline" disabled={run.isPending} onClick={() => run.mutate(() => setOrganizerStatus(o.uid, o.status === "active" ? "suspended" : "active"))}>
                {o.status === "active" ? "Suspendre" : "Reactivar"}
              </Action>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
