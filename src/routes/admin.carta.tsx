import { createFileRoute, Link } from "@tanstack/react-router";
import { AlertTriangle, CheckCircle2, Link2, Loader2, Trash2 } from "lucide-react";
import { useState } from "react";
import { AdminLayout, adminHead } from "@/components/app/AdminLayout";
import { Action, actionVariants } from "@/components/app/primitives";
import { demoImported, type ImportedDish } from "@/data/demo";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/admin/carta")({
  head: () => adminHead("Importar una carta", "Enganxa l'enllaç de la carta i revisa els plats."),
  component: CartaImportPage,
});

type Phase = "idle" | "loading" | "partial" | "complete" | "error" | "saved";

// SIMULATED import: replace with real import later.
function simulateImport(url: string): Promise<Phase> {
  return new Promise((r) => setTimeout(() => r(url.includes("error") ? "error" : url.includes("complet") ? "complete" : "partial"), 1600));
}

function CartaImportPage() {
  const [url, setUrl] = useState("https://lafondadelport.cat/carta");
  const [phase, setPhase] = useState<Phase>("idle");
  const [dishes, setDishes] = useState<ImportedDish[]>(demoImported);

  const run = async () => { setPhase("loading"); setPhase(await simulateImport(url)); };
  const update = (id: string, patch: Partial<ImportedDish>) => setDishes((d) => d.map((x) => (x.id === id ? { ...x, ...patch, doubt: undefined } : x)));
  const doubts = phase === "partial" ? dishes.filter((d) => d.doubt).length : 0;

  if (phase === "saved") {
    return (
      <AdminLayout title="Carta desada">
        <div className="rise mx-auto max-w-md rounded-3xl border bg-card p-8 text-center">
          <CheckCircle2 className="mx-auto size-14 text-success" aria-hidden />
          <h2 className="mt-4 text-2xl font-semibold">{dishes.length} plats a punt</h2>
          <p className="mt-2 text-lg text-muted-foreground">La trobada ja es pot compartir. (Simulació: no s'ha desat res.)</p>
          <Link to="/admin/comandes" className={actionVariants({ block: true, className: "mt-6" })}>Anar al seguiment</Link>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title="Afegir la carta" subtitle="La Fonda del Port">
      <section className="rounded-3xl border bg-card p-6">
        <label htmlFor="url" className="block text-lg font-bold">Enganxa l'enllaç de la carta del restaurant</label>
        <div className="mt-3 flex flex-col gap-3 sm:flex-row">
          <div className="relative flex-1">
            <Link2 className="absolute left-4 top-1/2 size-5 -translate-y-1/2 text-muted-foreground" aria-hidden />
            <input id="url" value={url} onChange={(e) => setUrl(e.target.value)} className="min-h-14 w-full rounded-xl border-2 border-input bg-background pl-12 pr-4 text-lg outline-none focus:border-primary" />
          </div>
          <Action onClick={run} disabled={phase === "loading" || !url}>
            {phase === "loading" ? <><Loader2 className="size-5 animate-spin" aria-hidden /> Important…</> : "Importar carta"}
          </Action>
        </div>
        <p className="mt-3 text-sm text-muted-foreground">Prova del prototip: escriu «error» o «complet» a l'enllaç per veure altres resultats.</p>
      </section>

      {phase === "loading" && (
        <div className="mt-6 space-y-3" role="status" aria-label="Llegint la carta">
          <p className="text-lg font-semibold">Estem llegint la carta. Pot trigar uns segons…</p>
          {[0, 1, 2].map((i) => <div key={i} className="h-16 animate-pulse rounded-2xl bg-muted" />)}
        </div>
      )}

      {phase === "error" && (
        <div role="alert" className="rise mt-6 flex gap-4 rounded-3xl bg-destructive-soft p-6 text-destructive">
          <AlertTriangle className="size-7 shrink-0" aria-hidden />
          <div><h2 className="font-sans text-lg font-bold">No hem pogut llegir aquesta carta</h2><p className="mt-1">Comprova l'enllaç o prova amb un altre. També pots afegir els plats a mà.</p></div>
        </div>
      )}

      {(phase === "partial" || phase === "complete") && (
        <section className="rise mt-6">
          <div className={cn("flex gap-3 rounded-2xl p-5", doubts ? "bg-warning-soft text-warning" : "bg-success-soft text-success")} role="status">
            {doubts ? <AlertTriangle className="size-6 shrink-0" aria-hidden /> : <CheckCircle2 className="size-6 shrink-0" aria-hidden />}
            <p className="font-semibold">{doubts ? `Hem trobat ${dishes.length} plats. Revisa'n ${doubts} marcats abans de desar.` : `Importació completada: ${dishes.length} plats. Dona-hi un cop d'ull.`}</p>
          </div>
          <h2 className="mt-8 text-2xl font-semibold">Revisa plats i preus</h2>
          <ul className="mt-4 space-y-3">
            {dishes.map((d) => {
              const flagged = phase === "partial" && d.doubt;
              return (
                <li key={d.id} className={cn("grid gap-3 rounded-2xl border-2 bg-card p-4 sm:grid-cols-[1fr_9rem_auto] sm:items-end", flagged ? "border-warning" : "border-border")}>
                  <div>
                    <span className="text-sm font-semibold text-muted-foreground">{d.category}</span>
                    <input aria-label="Nom del plat" value={d.name} onChange={(e) => update(d.id, { name: e.target.value })} className="mt-1 min-h-12 w-full rounded-lg border-2 border-input bg-background px-3 text-lg outline-none focus:border-primary" />
                    {flagged && <p className="mt-2 flex items-center gap-2 font-semibold text-warning"><AlertTriangle className="size-4" aria-hidden /> {d.doubt}</p>}
                  </div>
                  <div className="relative">
                    <input aria-label={`Preu de ${d.name}`} inputMode="decimal" value={d.price ?? ""} placeholder="—" onChange={(e) => update(d.id, { price: e.target.value ? Number(e.target.value.replace(",", ".")) : null })} className="tabular min-h-12 w-full rounded-lg border-2 border-input bg-background px-3 pr-8 text-lg outline-none focus:border-primary" />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">€</span>
                  </div>
                  <button onClick={() => setDishes((x) => x.filter((y) => y.id !== d.id))} className="inline-flex min-h-12 items-center gap-2 rounded-full px-3 font-semibold text-destructive hover:bg-destructive-soft"><Trash2 className="size-5" aria-hidden /> Treure</button>
                </li>
              );
            })}
          </ul>
          <Action block className="mt-6" onClick={() => setPhase("saved")} disabled={dishes.some((d) => d.price === null)}>Desar la carta</Action>
          {dishes.some((d) => d.price === null) && <p className="mt-2 text-center text-muted-foreground">Falta posar algun preu.</p>}
        </section>
      )}
    </AdminLayout>
  );
}
