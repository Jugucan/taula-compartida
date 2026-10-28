import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, Check, Plus, Store } from "lucide-react";
import { useRef, useState, type FormEvent } from "react";
import { AdminLayout, adminHead } from "@/components/app/AdminLayout";
import { useAdminUid } from "@/components/app/AdminGate";
import { Action, actionVariants } from "@/components/app/primitives";
import { buildEvent, createEvent, newPublicCode } from "@/lib/events";
import { useRestaurants } from "@/lib/use-restaurants";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/admin/nova")({
  head: () => adminHead("Crear una trobada", "Prepara una nova trobada en un minut."),
  component: NovaPage,
});

const inputCls = "mt-2 min-h-14 w-full rounded-xl border-2 border-input bg-card px-4 text-lg outline-none transition focus:border-primary";

function Field({ id, label, hint, children }: { id: string; label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <label htmlFor={id} className="block text-lg font-bold">{label} {hint && <span className="font-normal text-muted-foreground">{hint}</span>}</label>
      {children}
    </div>
  );
}

function NovaPage() {
  return (
    <AdminLayout title="Crear una trobada" subtitle="Només cal el bàsic. Podràs canviar-ho després.">
      <NovaForm />
    </AdminLayout>
  );
}

function NovaForm() {
  const uid = useAdminUid();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: restaurants, isLoading, isError } = useRestaurants(uid);
  const [chosen, setChosen] = useState("");
  const restaurantId = chosen || restaurants?.[0]?.id || "";

  const [name, setName] = useState("");
  const [dateTime, setDateTime] = useState("");
  const [deadline, setDeadline] = useState("");
  const [budget, setBudget] = useState("");
  const [extra, setExtra] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  // Identificadors fixos: si cal reintentar, no es crea una segona trobada.
  const ids = useRef<{ id: string; code: string } | null>(null);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError("");
    const built = buildEvent({ name, dateTime, deadline, budget, extra, restaurant: restaurants?.find((r) => r.id === restaurantId) });
    if (!built.ok) return setError(built.error);

    setSaving(true);
    try {
      ids.current ??= { id: crypto.randomUUID(), code: newPublicCode() };
      await createEvent(uid, ids.current.id, ids.current.code, built.event);
      await queryClient.invalidateQueries({ queryKey: ["events", uid] });
      await navigate({ to: "/admin/trobada/$id", params: { id: ids.current.id } });
    } catch {
      setError("No s'ha pogut desar la trobada. El que has escrit continua aquí; torna-ho a provar.");
      setSaving(false);
    }
  }

  return (
    <form className="grid gap-8 lg:grid-cols-[1fr_22rem]" onSubmit={submit}>
      <div className="space-y-8">
        <section className="space-y-5 rounded-3xl border bg-card p-6">
          <h2 className="text-xl font-semibold">1. La trobada</h2>
          <Field id="nom" label="Nom de la trobada"><input id="nom" className={inputCls} value={name} maxLength={80} onChange={(e) => setName(e.target.value)} placeholder="Per exemple: Sopar de Nadal" /></Field>
          <div className="grid gap-5 sm:grid-cols-2">
            <Field id="data" label="Data i hora"><input id="data" type="datetime-local" className={inputCls} value={dateTime} onChange={(e) => setDateTime(e.target.value)} /></Field>
            <Field id="limit" label="Data límit per triar"><input id="limit" type="date" className={inputCls} value={deadline} onChange={(e) => setDeadline(e.target.value)} /></Field>
          </div>
          <Field id="pressupost" label="Pressupost total" hint="(opcional)">
            <div className="relative"><input id="pressupost" inputMode="decimal" className={inputCls + " pr-10"} placeholder="520" value={budget} onChange={(e) => setBudget(e.target.value)} /><span className="absolute right-4 top-1/2 mt-1 -translate-y-1/2 text-lg text-muted-foreground">€</span></div>
          </Field>
          <Field id="nova-extra" label="Extra fix per persona (€)" hint="(opcional)">
            <input id="nova-extra" inputMode="decimal" placeholder="0" value={extra} onChange={(e) => setExtra(e.target.value)} className={inputCls} />
            <p className="mt-2 text-sm text-muted-foreground">Per a begudes i complements; se suma a l'import compartit.</p>
          </Field>
        </section>

        <section className="rounded-3xl border bg-card p-6">
          <h2 className="text-xl font-semibold">2. El restaurant</h2>
          <div className="mt-4 grid gap-3" role="radiogroup" aria-label="Restaurant">
            {isLoading && <p className="text-lg text-muted-foreground">Carregant els teus restaurants…</p>}
            {isError && <p role="alert" className="rounded-2xl bg-destructive-soft p-4 text-destructive">No s'han pogut carregar els restaurants. Torna-ho a provar d'aquí una estona.</p>}
            {restaurants?.length === 0 && <p className="text-lg text-muted-foreground">Encara no tens cap restaurant. Afegeix-ne un per començar.</p>}
            {(restaurants ?? []).map((r) => (
              <div key={r.id} className="flex items-stretch gap-2">
                <button type="button" role="radio" aria-checked={restaurantId === r.id} onClick={() => setChosen(r.id)}
                  className={cn("flex flex-1 items-center gap-4 rounded-2xl border-2 p-4 text-left transition", restaurantId === r.id ? "border-primary bg-primary-soft" : "border-border hover:border-input")}>
                  <Store className="size-6 shrink-0 text-muted-foreground" aria-hidden />
                  <span className="flex-1"><span className="block font-bold">{r.name}</span><span className="text-muted-foreground">{r.dishCount} plats a la carta</span></span>
                  {restaurantId === r.id && <span className="grid size-8 place-items-center rounded-full bg-primary text-primary-foreground"><Check className="size-5" aria-hidden /></span>}
                </button>
                <Link to="/admin/restaurant/$id" params={{ id: r.id }} className={actionVariants({ variant: "outline", size: "md", className: "h-auto" })}>Editar</Link>
              </div>
            ))}
            <Link to="/admin/carta" className={actionVariants({ variant: "outline", size: "md" })}><Plus className="size-5" aria-hidden /> Afegir un restaurant nou</Link>
          </div>
        </section>
      </div>

      <aside className="lg:sticky lg:top-6 lg:self-start">
        <div className="rounded-3xl bg-ink p-6 text-ink-foreground">
          <p className="text-sm font-bold uppercase tracking-widest opacity-70">Què passa després</p>
          <ol className="mt-4 space-y-3 text-lg">
            <li>1. Desem la trobada com a esborrany.</li>
            <li>2. Revises la carta.</li>
            <li>3. Comparteixes l'enllaç amb els convidats.</li>
          </ol>
          {error && (
            <div role="alert" className="mt-5 flex gap-2 rounded-2xl bg-destructive-soft p-4 text-destructive">
              <AlertTriangle className="size-5 shrink-0" aria-hidden />
              <p className="font-semibold">{error}</p>
            </div>
          )}
          <Action type="submit" block className="mt-6" disabled={saving}>{saving ? "Desant…" : "Desar i continuar"}</Action>
        </div>
      </aside>
    </form>
  );
}
