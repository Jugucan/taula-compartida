import { createFileRoute, Link } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, CalendarDays, Clock, Copy, MapPin } from "lucide-react";
import { useState } from "react";
import { AdminLayout, adminHead } from "@/components/app/AdminLayout";
import { useAdminUid } from "@/components/app/AdminGate";
import { Action, actionVariants, StatusBadge } from "@/components/app/primitives";
import { canTransition, deadlinePassed, effectiveStatus, formatDeadline, formatEventDate, reopenEvent, setEventStatus, validateNewDeadline, type EventStatus, type StoredEvent } from "@/lib/events";
import { centsToInput } from "@/lib/money";
import { useEvent } from "@/lib/use-events";

export const Route = createFileRoute("/admin/trobada/$id")({
  head: () => adminHead("Trobada", "Estat, enllaç i carta de la trobada."),
  component: TrobadaPage,
});

function TrobadaPage() {
  const { id } = Route.useParams();
  return (
    <AdminLayout title="La trobada" subtitle="Comparteix l'enllaç i controla les comandes.">
      <TrobadaLoader id={id} />
    </AdminLayout>
  );
}

const helper: Record<EventStatus, string> = {
  draft: "Ara mateix és un esborrany: els convidats encara no hi poden entrar. Quan estigui tot a punt, obre les comandes.",
  open: "Les comandes estan obertes: els convidats poden triar els plats amb l'enllaç.",
  closed: "Les comandes estan tancades: els convidats ja no poden fer canvis. Pots tornar-les a obrir.",
  done: "La trobada ha acabat. Es conserva a l'historial.",
};

function TrobadaLoader({ id }: { id: string }) {
  const uid = useAdminUid();
  const queryClient = useQueryClient();
  const { data: event, isLoading, isError } = useEvent(uid, id, () => queryClient.getQueryData<StoredEvent[]>(["events", uid])?.find((e) => e.id === id));

  if (isLoading) return <p className="text-lg text-muted-foreground">Carregant…</p>;
  if (isError) return <p role="alert" className="rounded-2xl bg-destructive-soft p-4 text-destructive">No s'ha pogut carregar la trobada. Torna-ho a provar d'aquí una estona.</p>;
  if (!event) {
    return (
      <div className="rounded-3xl border bg-card p-8 text-center">
        <p className="text-lg">Aquesta trobada no existeix.</p>
        <Link to="/admin" className={actionVariants({ block: true, className: "mt-6" })}>Tornar a l'inici</Link>
      </div>
    );
  }
  return <TrobadaView event={event} uid={uid} />;
}

function TrobadaView({ event, uid }: { event: StoredEvent; uid: string }) {
  const queryClient = useQueryClient();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const [confirmDone, setConfirmDone] = useState(false);
  const [askDate, setAskDate] = useState(false);
  const [newDeadline, setNewDeadline] = useState("");
  const { status: shown, autoClosed } = effectiveStatus(event.status, event.deadline);
  const link = `${typeof window === "undefined" ? "" : window.location.origin}/t/${event.publicCode}`;

  async function change(to: EventStatus) {
    if (!canTransition(event.status, to)) return;
    setSaving(true);
    setError("");
    try {
      await setEventStatus(uid, event.id, to);
      queryClient.setQueryData<StoredEvent>(["event", uid, event.id], { ...event, status: to });
      await queryClient.invalidateQueries({ queryKey: ["events", uid] });
      setConfirmDone(false);
    } catch {
      setError("No s'ha pogut canviar l'estat. Torna-ho a provar.");
    } finally {
      setSaving(false);
    }
  }

  async function open(deadline?: string) {
    setSaving(true);
    setError("");
    try {
      await reopenEvent(uid, event.id, deadline);
      queryClient.setQueryData<StoredEvent>(["event", uid, event.id], { ...event, status: "open", deadline: deadline ?? event.deadline });
      await queryClient.invalidateQueries({ queryKey: ["events", uid] });
      setAskDate(false);
    } catch {
      setError("No s'han pogut obrir les comandes. Torna-ho a provar.");
    } finally {
      setSaving(false);
    }
  }

  function startOpen() {
    if (deadlinePassed(event.deadline)) {
      setNewDeadline("");
      setAskDate(true);
    } else {
      void open();
    }
  }

  function confirmOpenWithDate() {
    const check = validateNewDeadline(newDeadline, event.dateTime);
    if (!check.ok) return setError(check.error);
    void open(newDeadline);
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      setError("No s'ha pogut copiar. Selecciona l'enllaç i copia'l a mà.");
    }
  }

  return (
    <div className="space-y-8">
      <section className="rounded-3xl border bg-card p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-2xl font-semibold">{event.name}</h2>
          <StatusBadge status={shown} />
        </div>
        <ul className="mt-4 space-y-2 text-lg text-muted-foreground">
          <li className="flex items-center gap-3"><MapPin className="size-5 shrink-0" aria-hidden /> {event.restaurantName}</li>
          <li className="flex items-center gap-3"><CalendarDays className="size-5 shrink-0" aria-hidden /> {formatEventDate(event.dateTime)}</li>
          <li className="flex items-center gap-3"><Clock className="size-5 shrink-0" aria-hidden /> Es pot triar fins al {formatDeadline(event.deadline)}</li>
        </ul>
        <p className="mt-3 text-muted-foreground">
          {event.budgetCents === null ? "Sense pressupost." : `Pressupost: ${centsToInput(event.budgetCents)} €.`}
          {event.extraCents > 0 && ` Extra per persona: ${centsToInput(event.extraCents)} €.`}
        </p>
      </section>

      <section className="rounded-3xl border bg-card p-6">
        <p className="text-lg">{autoClosed ? `Les comandes es van tancar soles perquè el termini va acabar el ${formatDeadline(event.deadline)}. Les pots tornar a obrir triant una nova data límit.` : helper[shown]}</p>
        {error && (
          <div role="alert" className="mt-4 flex gap-3 rounded-2xl bg-destructive-soft p-4 text-destructive">
            <AlertTriangle className="size-5 shrink-0" aria-hidden /><p className="font-semibold">{error}</p>
          </div>
        )}
        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
          {(shown === "draft" || shown === "closed") && !askDate && <Action onClick={startOpen} disabled={saving}>{shown === "draft" ? "Obrir les comandes" : "Tornar a obrir les comandes"}</Action>}
          {shown === "open" && <Action onClick={() => change("closed")} disabled={saving}>Tancar les comandes</Action>}
          {canTransition(event.status, "done") && !confirmDone && <Action variant="outline" onClick={() => setConfirmDone(true)} disabled={saving}>Finalitzar la trobada</Action>}
        </div>
        {askDate && (
          <div className="mt-4 rounded-2xl bg-secondary p-4">
            <label htmlFor="nova-data-limit" className="block text-lg font-bold">Fins quan es poden triar els plats?</label>
            <input id="nova-data-limit" type="date" value={newDeadline} onChange={(e) => setNewDeadline(e.target.value)} className="mt-2 min-h-14 w-full rounded-xl border-2 border-input bg-card px-4 text-lg outline-none focus:border-primary sm:max-w-xs" />
            <p className="mt-2 text-muted-foreground">La trobada és el {formatEventDate(event.dateTime)}. Si s'ha posposat, primer <Link to="/admin/editar-trobada/$id" params={{ id: event.id }} className="font-semibold text-primary underline">modifica'n la data</Link>.</p>
            <div className="mt-3 flex flex-col gap-3 sm:flex-row">
              <Action variant="outline" onClick={() => { setAskDate(false); setError(""); }} disabled={saving}>Cancel·lar</Action>
              <Action onClick={confirmOpenWithDate} disabled={saving}>{saving ? "Desant…" : "Obrir les comandes"}</Action>
            </div>
          </div>
        )}
        {confirmDone && (
          <div role="alertdialog" aria-label="Confirma que vols finalitzar la trobada" className="mt-4 rounded-2xl bg-secondary p-4">
            <p className="font-semibold">Segur que vols finalitzar la trobada? Després ja no es pot tornar a obrir.</p>
            <div className="mt-3 flex flex-col gap-3 sm:flex-row">
              <Action variant="outline" onClick={() => setConfirmDone(false)} disabled={saving}>No, encara no</Action>
              <Action variant="ink" onClick={() => change("done")} disabled={saving}>{saving ? "Desant…" : "Sí, finalitzar"}</Action>
            </div>
          </div>
        )}
      </section>

      <section className="rounded-3xl border bg-card p-6">
        <h2 className="text-xl font-semibold">Canviar o repetir aquesta trobada</h2>
        <p className="mt-2 text-muted-foreground">Pots modificar-ho tot (també si la trobada es posposa) o crear-ne una còpia per a la propera vegada.</p>
        <div className="mt-4 flex flex-col gap-3 sm:flex-row">
          <Link to="/admin/editar-trobada/$id" params={{ id: event.id }} className={actionVariants({ variant: "outline" })}>Modificar la trobada</Link>
          <Link to="/admin/copiar-trobada/$id" params={{ id: event.id }} className={actionVariants({ variant: "outline" })}>Copiar aquesta trobada</Link>
        </div>
      </section>

      <section className="rounded-3xl border bg-card p-6">
        <h2 className="text-xl font-semibold">L'enllaç per als convidats</h2>
        <p className="mt-2 text-muted-foreground">Qui el tingui pot triar els seus plats. No cal que cap convidat creï un compte.</p>
        <div className="mt-4 flex flex-col gap-3 sm:flex-row">
          <input readOnly aria-label="Enllaç per als convidats" value={link} onFocus={(e) => e.currentTarget.select()} className="min-h-14 w-full rounded-xl border-2 border-input bg-background px-4 text-base outline-none" />
          <Action variant="soft" onClick={copy}><Copy className="size-5" aria-hidden /> {copied ? "Copiat!" : "Copiar l'enllaç"}</Action>
        </div>
      </section>

      <section className="rounded-3xl border bg-card p-6">
        <h2 className="text-xl font-semibold">La carta ({event.dishCount} plats)</h2>
        <p className="mt-2 text-muted-foreground">Aquesta és la còpia de la carta que veuran els convidats. Si després canvies el restaurant, aquesta trobada no canvia.</p>
        <div className="mt-4 space-y-5">
          {event.menu.map((c) => (
            <div key={c.id}>
              <h3 className="font-sans text-sm font-bold uppercase tracking-widest text-muted-foreground">{c.name}</h3>
              <ul className="mt-2 divide-y">
                {c.dishes.map((d) => (
                  <li key={d.id} className="flex justify-between gap-4 py-2 text-lg"><span>{d.name}</span><span className="tabular shrink-0">{centsToInput(d.price)} €</span></li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
