// Formulari per crear o modificar un restaurant i la seva carta.
import { Link, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, CheckCircle2, Plus, Trash2 } from "lucide-react";
import { useRef, useState } from "react";
import { useAdminUid } from "@/components/app/AdminGate";
import { Action, actionVariants } from "@/components/app/primitives";
import { getClientAuth } from "@/lib/firebase-client";
import { importMenuFromUrl } from "@/lib/menu-import-api";
import { parseMenuText, type ImportedDish } from "@/lib/menu-import";
import { buildMenu, CATEGORIES, cleanUrl, deleteRestaurant, draftsFromRestaurant, saveRestaurant, updateRestaurant, type DishDraft, type StoredRestaurant } from "@/lib/restaurants";

const inputCls = "min-h-12 w-full rounded-lg border-2 border-input bg-background px-3 text-lg outline-none focus:border-primary";
const bigInputCls = inputCls + " mt-2 min-h-14 rounded-xl";
const newRow = (): DishDraft => ({ key: crypto.randomUUID(), category: "Primers", name: "", price: "" });

export function RestaurantForm({ existing }: { existing?: StoredRestaurant }) {
  const uid = useAdminUid();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const restaurantId = useRef<string | null>(existing?.id ?? null);
  const [name, setName] = useState(existing?.name ?? "");
  const [url, setUrl] = useState(existing?.url ?? "");
  const [rows, setRows] = useState<DishDraft[]>(() => (existing ? draftsFromRestaurant(existing) : [newRow()]));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [savedCount, setSavedCount] = useState<number | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [importMode, setImportMode] = useState<null | "url" | "text">(null);
  const [importUrl, setImportUrl] = useState("");
  const [importText, setImportText] = useState("");
  const [importing, setImporting] = useState(false);
  const [importMsg, setImportMsg] = useState<{ tone: "ok" | "error"; text: string } | null>(null);
  const [confirmClear, setConfirmClear] = useState(false);

  const update = (key: string, patch: Partial<DishDraft>) => setRows((r) => r.map((x) => (x.key === key ? { ...x, ...patch } : x)));
  const refresh = () => Promise.all([
    queryClient.invalidateQueries({ queryKey: ["restaurants", uid] }),
    queryClient.invalidateQueries({ queryKey: ["restaurant", uid, restaurantId.current] }),
  ]);

  function addImported(dishes: ImportedDish[], withoutPrice: number) {
    const fresh: DishDraft[] = dishes.map((d) => ({
      key: crypto.randomUUID(), category: d.category, name: d.name, price: d.price,
      ...(d.description ? { description: d.description } : {}),
      ...(d.optionValues ? { optionsOpen: true, optionLabel: d.optionLabel, optionValues: d.optionValues } : {}),
    }));
    setRows((r) => [...r.filter((x) => x.name.trim() || x.price.trim()), ...fresh]);
    const categories = new Set(dishes.map((d) => d.category)).size;
    setImportMsg({ tone: "ok", text: `He trobat ${dishes.length} plats en ${categories} ${categories === 1 ? "categoria" : "categories"}. Revisa'ls més avall${withoutPrice ? `: n'hi ha ${withoutPrice} sense preu (en vermell) i els has d'omplir tu` : ""}.` });
    setImportMode(null);
  }

  async function readUrl() {
    setImportMsg(null);
    if (!importUrl.trim()) return setImportMsg({ tone: "error", text: "Enganxa primer l'enllaç de la carta." });
    setImporting(true);
    try {
      const idToken = await getClientAuth().currentUser?.getIdToken();
      const result = await importMenuFromUrl({ data: { url: importUrl.trim(), idToken: idToken ?? "" } });
      if (!result.ok) return setImportMsg({ tone: "error", text: result.error });
      if (!name.trim() && result.title) setName(result.title.slice(0, 80));
      if (!url.trim() && cleanUrl(importUrl).ok) setUrl(importUrl.trim());
      addImported(result.dishes, result.withoutPrice);
    } catch {
      setImportMsg({ tone: "error", text: "No he pogut llegir la carta ara mateix. Comprova la connexió o enganxa'n el text." });
    } finally {
      setImporting(false);
    }
  }

  function readText() {
    setImportMsg(null);
    const result = parseMenuText(importText);
    if (result.dishes.length === 0) return setImportMsg({ tone: "error", text: "No he trobat cap plat amb preu en aquest text. Comprova que hi surten els preus, o afegeix els plats a mà." });
    addImported(result.dishes, result.withoutPrice);
    setImportText("");
  }

  async function save() {
    setError("");
    if (!name.trim()) return setError("Escriu el nom del restaurant.");
    const link = cleanUrl(url);
    if (!link.ok) return setError("L'enllaç no sembla correcte. Pots deixar-lo en blanc.");
    const menu = buildMenu(rows);
    if (!menu.ok) return setError(menu.error);

    setSaving(true);
    try {
      const data = { name: name.trim(), url: link.url, categories: menu.categories, dishCount: menu.dishCount };
      if (existing) {
        await updateRestaurant(uid, existing.id, data);
      } else {
        // Mateix identificador en cada intent: si es repeteix, no es duplica.
        restaurantId.current ??= crypto.randomUUID();
        await saveRestaurant(uid, restaurantId.current, data);
      }
      await refresh();
      setSavedCount(menu.dishCount);
    } catch {
      setError("No s'ha pogut desar. El que has escrit continua aquí; torna-ho a provar.");
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    if (!existing) return;
    setSaving(true);
    setError("");
    try {
      await deleteRestaurant(uid, existing.id);
      await queryClient.invalidateQueries({ queryKey: ["restaurants", uid] });
      queryClient.removeQueries({ queryKey: ["restaurant", uid, existing.id] });
      await navigate({ to: "/admin/nova" });
    } catch {
      setError("No s'ha pogut eliminar. Torna-ho a provar.");
      setSaving(false);
    }
  }

  if (savedCount !== null) {
    return (
      <div className="rise mx-auto max-w-md rounded-3xl border bg-card p-8 text-center">
        <CheckCircle2 className="mx-auto size-14 text-success" aria-hidden />
        <h2 className="mt-4 text-2xl font-semibold">{existing ? "Canvis desats" : `${name.trim()} desat`}</h2>
        <p className="mt-2 text-lg text-muted-foreground">{savedCount} plats a la carta.{existing ? "" : " Ja el pots triar en una trobada."}</p>
        <Link to="/admin/nova" className={actionVariants({ block: true, className: "mt-6" })}>Anar a crear una trobada</Link>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <section className="space-y-5 rounded-3xl border bg-card p-6">
        <h2 className="text-xl font-semibold">1. El restaurant</h2>
        <div>
          <label htmlFor="nom-restaurant" className="block text-lg font-bold">Nom del restaurant</label>
          <input id="nom-restaurant" value={name} maxLength={80} onChange={(e) => setName(e.target.value)} className={bigInputCls} />
        </div>
        <div>
          <label htmlFor="url-restaurant" className="block text-lg font-bold">Enllaç de la carta <span className="font-normal text-muted-foreground">(opcional)</span></label>
          <input id="url-restaurant" value={url} onChange={(e) => setUrl(e.target.value)} inputMode="url" placeholder="https://" className={bigInputCls} />
        </div>
      </section>

      <section className="rounded-3xl border bg-card p-6">
        <h2 className="text-xl font-semibold">2. Els plats</h2>
        <div className="mt-4 rounded-2xl bg-secondary p-5">
          <p className="text-lg font-bold">Més ràpid: llegeix la carta automàticament</p>
          <p className="mt-1 text-muted-foreground">No cal escriure els plats un per un.</p>
          <div className="mt-4 flex flex-col gap-3 sm:flex-row">
            <Action variant={importMode === "url" ? "ink" : "outline"} size="md" onClick={() => { setImportMode(importMode === "url" ? null : "url"); setImportMsg(null); }}>Des d'un enllaç de la web</Action>
            <Action variant={importMode === "text" ? "ink" : "outline"} size="md" onClick={() => { setImportMode(importMode === "text" ? null : "text"); setImportMsg(null); }}>Enganxar el text de la carta</Action>
          </div>
          {importMode === "url" && (
            <div className="mt-4">
              <label htmlFor="import-url" className="block text-lg font-bold">Enllaç de la carta</label>
              <input id="import-url" inputMode="url" placeholder="https://" value={importUrl} onChange={(e) => setImportUrl(e.target.value)} className={bigInputCls} />
              <Action className="mt-3" onClick={readUrl} disabled={importing}>{importing ? "Llegint la carta…" : "Llegir la carta"}</Action>
            </div>
          )}
          {importMode === "text" && (
            <div className="mt-4">
              <label htmlFor="import-text" className="block text-lg font-bold">Enganxa aquí el text de la carta</label>
              <p className="text-muted-foreground">Pots copiar-lo d'una web, d'un PDF o d'un correu. Funciona millor si cada plat porta el seu preu i les categories (ENTRANTS, SEGONS…) van en majúscules.</p>
              <textarea id="import-text" rows={8} value={importText} onChange={(e) => setImportText(e.target.value)} className="mt-2 w-full rounded-xl border-2 border-input bg-background p-4 text-base outline-none focus:border-primary" />
              <Action className="mt-3" onClick={readText}>Llegir el text</Action>
            </div>
          )}
          {importMsg && <p role={importMsg.tone === "error" ? "alert" : "status"} className={`mt-4 rounded-xl p-4 font-semibold ${importMsg.tone === "error" ? "bg-destructive-soft text-destructive" : "bg-success-soft text-success"}`}>{importMsg.text}</p>}
        </div>
        {existing && <p className="mt-2 text-muted-foreground">Les trobades que ja has creat no canvien: conserven la seva còpia de la carta. Per aplicar-hi els canvis, fes servir «Actualitzar la carta» a «Modificar la trobada».</p>}
        <ul className="mt-4 space-y-3">
          {rows.map((d, i) => (
            <li key={d.key} className="grid gap-3 rounded-2xl border-2 border-border bg-card p-4 sm:grid-cols-[9rem_1fr_8rem_auto] sm:items-end">
              <input aria-label={`Categoria del plat ${i + 1}`} list="categories-list" placeholder="Categoria" value={d.category} maxLength={40} onChange={(e) => update(d.key, { category: e.target.value })} className={inputCls} />
              <input aria-label={`Nom del plat ${i + 1}`} placeholder="Nom del plat" value={d.name} maxLength={80} onChange={(e) => update(d.key, { name: e.target.value })} className={inputCls} />
              <div className="relative">
                <input aria-label={`Preu del plat ${i + 1}`} inputMode="decimal" placeholder="0,00" value={d.price} onChange={(e) => update(d.key, { price: e.target.value })} className={inputCls + " tabular pr-8" + (d.name.trim() && !d.price.trim() ? " border-destructive" : "")} />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">€</span>
              </div>
              <button type="button" onClick={() => setRows((r) => (r.length > 1 ? r.filter((x) => x.key !== d.key) : r))} className="inline-flex min-h-12 items-center gap-2 rounded-full px-3 font-semibold text-destructive hover:bg-destructive-soft">
                <Trash2 className="size-5" aria-hidden /> Treure
              </button>
              <div className="sm:col-span-4">
                {!d.optionsOpen ? (
                  <button type="button" onClick={() => update(d.key, { optionsOpen: true })} className="font-semibold text-primary underline">
                    + Aquest plat té opcions (salsa, punt de cocció…)
                  </button>
                ) : (
                  <div className="grid gap-3 rounded-xl bg-secondary p-4 sm:grid-cols-[12rem_1fr]">
                    <div>
                      <label htmlFor={`opcio-nom-${d.key}`} className="block font-semibold">Què s'ha de triar?</label>
                      <input id={`opcio-nom-${d.key}`} placeholder="Punt de cocció" value={d.optionLabel ?? ""} maxLength={30} onChange={(e) => update(d.key, { optionLabel: e.target.value })} className={inputCls + " mt-1"} />
                    </div>
                    <div>
                      <label htmlFor={`opcio-valors-${d.key}`} className="block font-semibold">Les opcions, separades per comes</label>
                      <input id={`opcio-valors-${d.key}`} placeholder="Poc fet, Al punt, Ben fet" value={d.optionValues ?? ""} onChange={(e) => update(d.key, { optionValues: e.target.value })} className={inputCls + " mt-1"} />
                    </div>
                    <button type="button" onClick={() => update(d.key, { optionsOpen: false, optionLabel: "", optionValues: "" })} className="justify-self-start font-semibold text-destructive underline sm:col-span-2">
                      Treure les opcions d'aquest plat
                    </button>
                  </div>
                )}
              </div>
            </li>
          ))}
        </ul>
        <datalist id="categories-list">{[...new Set([...CATEGORIES, ...rows.map((r) => r.category.trim()).filter(Boolean)])].map((c) => <option key={c} value={c} />)}</datalist>
        <button type="button" onClick={() => setRows((r) => [...r, newRow()])} className={actionVariants({ variant: "outline", size: "md", className: "mt-4" })}>
          <Plus className="size-5" aria-hidden /> Afegir un plat
        </button>
        {rows.length > 3 && (confirmClear ? (
          <span className="mt-4 ml-4 inline-flex items-center gap-3">
            <span className="font-semibold">Segur?</span>
            <button type="button" onClick={() => { setRows([newRow()]); setConfirmClear(false); }} className="font-semibold text-destructive underline">Sí, esborrar-los tots</button>
            <button type="button" onClick={() => setConfirmClear(false)} className="font-semibold underline">No</button>
          </span>
        ) : (
          <button type="button" onClick={() => setConfirmClear(true)} className="mt-4 ml-4 font-semibold text-destructive underline">Esborrar tots els plats</button>
        ))}
      </section>

      {error && (
        <div role="alert" className="flex gap-3 rounded-2xl bg-destructive-soft p-5 text-destructive">
          <AlertTriangle className="size-6 shrink-0" aria-hidden />
          <p className="font-semibold">{error}</p>
        </div>
      )}
      <Action block onClick={save} disabled={saving}>{saving ? "Desant…" : existing ? "Desar els canvis" : "Desar el restaurant"}</Action>

      {existing && (
        <section className="rounded-3xl border bg-card p-6">
          {!confirmDelete ? (
            <button type="button" onClick={() => setConfirmDelete(true)} className="font-semibold text-destructive underline">Eliminar aquest restaurant</button>
          ) : (
            <div role="alertdialog" aria-label="Confirma que vols eliminar el restaurant">
              <p className="text-lg font-semibold">Segur que vols eliminar «{existing.name}»?</p>
              <p className="mt-1 text-muted-foreground">No es pot desfer. Les trobades que ja existeixen conserven la seva còpia de la carta.</p>
              <div className="mt-4 flex flex-col gap-3 sm:flex-row">
                <Action variant="outline" onClick={() => setConfirmDelete(false)} disabled={saving}>No, el vull conservar</Action>
                <Action variant="ink" onClick={remove} disabled={saving}>{saving ? "Eliminant…" : "Sí, eliminar-lo"}</Action>
              </div>
            </div>
          )}
        </section>
      )}
    </div>
  );
}
