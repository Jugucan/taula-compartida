import { createFileRoute, Link } from "@tanstack/react-router";
import { Check, Plus, Store } from "lucide-react";
import { useState } from "react";
import { AdminLayout, adminHead } from "@/components/app/AdminLayout";
import { actionVariants } from "@/components/app/primitives";
import { useAdminUid } from "@/components/app/AdminGate";
import { useRestaurants } from "@/lib/use-restaurants";
import { cn } from "@/lib/utils";
import { useOrder } from "@/lib/order-store";

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
  const { data: restaurants, isLoading, isError } = useRestaurants(uid);
  const [chosen, setChosen] = useState("");
  const restaurant = chosen || restaurants?.[0]?.id || "";
  const { extra, setExtra } = useOrder();

  return (
    <>
      <form className="grid gap-8 lg:grid-cols-[1fr_22rem]" onSubmit={(e) => e.preventDefault()}>
        <div className="space-y-8">
          <section className="space-y-5 rounded-3xl border bg-card p-6">
            <h2 className="text-xl font-semibold">1. La trobada</h2>
            <Field id="nom" label="Nom de la trobada"><input id="nom" className={inputCls} defaultValue="Sopar de Nadal de la colla" /></Field>
            <div className="grid gap-5 sm:grid-cols-2">
              <Field id="data" label="Data i hora"><input id="data" type="datetime-local" className={inputCls} defaultValue="2026-12-18T21:00" /></Field>
              <Field id="limit" label="Data límit per triar"><input id="limit" type="date" className={inputCls} defaultValue="2026-12-15" /></Field>
            </div>
            <Field id="pressupost" label="Pressupost total" hint="(opcional)">
              <div className="relative"><input id="pressupost" inputMode="decimal" className={inputCls + " pr-10"} placeholder="520" /><span className="absolute right-4 top-1/2 mt-1 -translate-y-1/2 text-lg text-muted-foreground">€</span></div>
            </Field>
            <Field id="nova-extra" label="Extra fix per persona (€)" hint="(opcional)">
              <input id="nova-extra" type="number" min="0" step="0.50" value={extra / 100} onChange={e => setExtra(Number(e.target.value))} className={inputCls} />
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
                <button type="button" role="radio" aria-checked={restaurant === r.id} onClick={() => setChosen(r.id)}
                  className={cn("flex flex-1 items-center gap-4 rounded-2xl border-2 p-4 text-left transition", restaurant === r.id ? "border-primary bg-primary-soft" : "border-border hover:border-input")}>
                  <Store className="size-6 shrink-0 text-muted-foreground" aria-hidden />
                  <span className="flex-1"><span className="block font-bold">{r.name}</span><span className="text-muted-foreground">{r.dishCount} plats a la carta</span></span>
                  {restaurant === r.id && <span className="grid size-8 place-items-center rounded-full bg-primary text-primary-foreground"><Check className="size-5" aria-hidden /></span>}
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
            <Link to="/admin/carta" className={actionVariants({ block: true, className: "mt-6" })}>Desar i continuar</Link>
            <p className="mt-3 text-center text-sm opacity-70">Prototip: no es desa res.</p>
          </div>
        </aside>
      </form>
    </>
  );
}
