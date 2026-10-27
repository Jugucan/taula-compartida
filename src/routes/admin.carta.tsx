import { createFileRoute, Link } from "@tanstack/react-router";
import { AlertTriangle, CheckCircle2, Plus, Trash2 } from "lucide-react";
import { useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { AdminLayout, adminHead } from "@/components/app/AdminLayout";
import { useAdminUid } from "@/components/app/AdminGate";
import { Action, actionVariants } from "@/components/app/primitives";
import { buildMenu, CATEGORIES, cleanUrl, saveRestaurant, type DishDraft } from "@/lib/restaurants";

export const Route = createFileRoute("/admin/carta")({
  head: () => adminHead("Afegir un restaurant", "Escriu el nom del restaurant i els plats de la carta."),
  component: CartaPage,
});

const inputCls = "min-h-12 w-full rounded-lg border-2 border-input bg-background px-3 text-lg outline-none focus:border-primary";
const newRow = (): DishDraft => ({ key: crypto.randomUUID(), category: "Primers", name: "", price: "" });

function CartaPage() {
  return (
    <AdminLayout title="Afegir un restaurant" subtitle="Escriu el nom i els plats. Després els podràs reutilitzar en altres trobades.">
      <CartaForm />
    </AdminLayout>
  );
}

function CartaForm() {
  const uid = useAdminUid();
  const queryClient = useQueryClient();
  const restaurantId = useRef<string | null>(null);
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [rows, setRows] = useState<DishDraft[]>(() => [newRow()]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [savedCount, setSavedCount] = useState<number | null>(null);

  const update = (key: string, patch: Partial<DishDraft>) => setRows((r) => r.map((x) => (x.key === key ? { ...x, ...patch } : x)));

  async function save() {
    setError("");
    if (!name.trim()) return setError("Escriu el nom del restaurant.");
    const link = cleanUrl(url);
    if (!link.ok) return setError("L'enllaç no sembla correcte. Pots deixar-lo en blanc.");
    const menu = buildMenu(rows);
    if (!menu.ok) return setError(menu.error);

    setSaving(true);
    try {
      // Mateix identificador en cada intent: si es repeteix, no es duplica.
      restaurantId.current ??= crypto.randomUUID();
      await saveRestaurant(uid, restaurantId.current, { name: name.trim(), url: link.url, categories: menu.categories, dishCount: menu.dishCount });
      await queryClient.invalidateQueries({ queryKey: ["restaurants", uid] });
      setSavedCount(menu.dishCount);
    } catch {
      setError("No s'ha pogut desar. El que has escrit continua aquí; torna-ho a provar.");
    } finally {
      setSaving(false);
    }
  }

  if (savedCount !== null) {
    return (
      <div className="rise mx-auto max-w-md rounded-3xl border bg-card p-8 text-center">
        <CheckCircle2 className="mx-auto size-14 text-success" aria-hidden />
        <h2 className="mt-4 text-2xl font-semibold">{name.trim()} desat</h2>
        <p className="mt-2 text-lg text-muted-foreground">{savedCount} plats a la carta. Ja el pots triar en una trobada.</p>
        <Link to="/admin/nova" className={actionVariants({ block: true, className: "mt-6" })}>Crear una trobada</Link>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <section className="space-y-5 rounded-3xl border bg-card p-6">
        <h2 className="text-xl font-semibold">1. El restaurant</h2>
        <div>
          <label htmlFor="nom-restaurant" className="block text-lg font-bold">Nom del restaurant</label>
          <input id="nom-restaurant" value={name} maxLength={80} onChange={(e) => setName(e.target.value)} className={inputCls + " mt-2 min-h-14 rounded-xl text-lg"} />
        </div>
        <div>
          <label htmlFor="url-restaurant" className="block text-lg font-bold">Enllaç de la carta <span className="font-normal text-muted-foreground">(opcional)</span></label>
          <input id="url-restaurant" value={url} onChange={(e) => setUrl(e.target.value)} inputMode="url" placeholder="https://" className={inputCls + " mt-2 min-h-14 rounded-xl text-lg"} />
        </div>
      </section>

      <section className="rounded-3xl border bg-card p-6">
        <h2 className="text-xl font-semibold">2. Els plats</h2>
        <ul className="mt-4 space-y-3">
          {rows.map((d, i) => (
            <li key={d.key} className="grid gap-3 rounded-2xl border-2 border-border bg-card p-4 sm:grid-cols-[9rem_1fr_8rem_auto] sm:items-end">
              <select aria-label={`Categoria del plat ${i + 1}`} value={d.category} onChange={(e) => update(d.key, { category: e.target.value })} className={inputCls}>
                {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
              <input aria-label={`Nom del plat ${i + 1}`} placeholder="Nom del plat" value={d.name} maxLength={80} onChange={(e) => update(d.key, { name: e.target.value })} className={inputCls} />
              <div className="relative">
                <input aria-label={`Preu del plat ${i + 1}`} inputMode="decimal" placeholder="0,00" value={d.price} onChange={(e) => update(d.key, { price: e.target.value })} className={inputCls + " tabular pr-8"} />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">€</span>
              </div>
              <button type="button" onClick={() => setRows((r) => (r.length > 1 ? r.filter((x) => x.key !== d.key) : r))} className="inline-flex min-h-12 items-center gap-2 rounded-full px-3 font-semibold text-destructive hover:bg-destructive-soft">
                <Trash2 className="size-5" aria-hidden /> Treure
              </button>
            </li>
          ))}
        </ul>
        <button type="button" onClick={() => setRows((r) => [...r, newRow()])} className={actionVariants({ variant: "outline", size: "md", className: "mt-4" })}>
          <Plus className="size-5" aria-hidden /> Afegir un plat
        </button>
      </section>

      {error && (
        <div role="alert" className="flex gap-3 rounded-2xl bg-destructive-soft p-5 text-destructive">
          <AlertTriangle className="size-6 shrink-0" aria-hidden />
          <p className="font-semibold">{error}</p>
        </div>
      )}
      <Action block onClick={save} disabled={saving}>{saving ? "Desant…" : "Desar el restaurant"}</Action>
    </div>
  );
}
