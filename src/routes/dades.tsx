import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { AlertCircle, Loader2 } from "lucide-react";
import { useState } from "react";
import { GuestLayout } from "@/components/app/GuestLayout";
import { Action, actionVariants, StateMessage } from "@/components/app/primitives";
import { useOrder } from "@/lib/order-store";
import { formatEuro, plural } from "@/lib/format";

export const Route = createFileRoute("/dades")({
  head: () => ({
    meta: [
      { title: "Les teves dades · Taula" },
      { name: "description", content: "Escriu el teu nom per enviar la comanda." },
      { property: "og:title", content: "Les teves dades · Taula" },
      { property: "og:description", content: "Escriu el teu nom per enviar la comanda." },
    ],
  }),
  component: DadesPage,
});

function DadesPage() {
  const { guestName, setGuestName, note, setNote, count, total, simulateSend } = useOrder();
  const [error, setError] = useState(false);
  const [sending, setSending] = useState(false);
  const navigate = useNavigate();

  if (count === 0) {
    return (
      <GuestLayout back={{ to: "/carta", label: "Tornar a la carta" }}>
        <StateMessage title="Encara no has triat cap plat" action={<Link to="/carta" className={actionVariants({ block: true })}>Veure la carta</Link>} />
      </GuestLayout>
    );
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (guestName.trim().length < 2) { setError(true); return; }
    setSending(true);
    await simulateSend();
    navigate({ to: "/enviada" });
  };

  return (
    <GuestLayout back={{ to: "/revisio", label: "Tornar" }} step={2}>
      <form onSubmit={submit} className="rise pb-12 pt-8" noValidate>
        <h1 className="text-3xl font-semibold">Com et dius?</h1>
        <p className="mt-2 text-lg text-muted-foreground">Així l'organitzadora sabrà de qui és cada plat.</p>

        <label htmlFor="name" className="mt-8 block text-lg font-bold">El teu nom</label>
        <input id="name" value={guestName} autoComplete="name" onChange={(e) => { setGuestName(e.target.value); setError(false); }}
          aria-invalid={error} aria-describedby={error ? "name-error" : undefined} placeholder="Per exemple, Maria Puig"
          className="mt-2 min-h-14 w-full rounded-xl border-2 border-input bg-card px-4 text-lg outline-none transition focus:border-primary aria-[invalid=true]:border-destructive" />
        {error && <p id="name-error" className="mt-2 flex items-center gap-2 font-semibold text-destructive"><AlertCircle className="size-5" aria-hidden /> Escriu el teu nom per continuar.</p>}

        <label htmlFor="note" className="mt-6 block text-lg font-bold">Alguna cosa a tenir en compte? <span className="font-normal text-muted-foreground">(opcional)</span></label>
        <textarea id="note" rows={3} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Al·lèrgies, intoleràncies…"
          className="mt-2 w-full rounded-xl border-2 border-input bg-card p-4 text-lg outline-none transition focus:border-primary" />

        <div className="mt-8 flex justify-between rounded-2xl bg-secondary p-5 text-lg">
          <span>{plural(count, "plat", "plats")}</span><span className="tabular font-bold">{formatEuro(total)}</span>
        </div>
        <Action type="submit" block className="mt-6" disabled={sending}>
          {sending ? <><Loader2 className="size-5 animate-spin" aria-hidden /> Enviant…</> : "Enviar comanda"}
        </Action>
        <p className="mt-3 text-center text-sm text-muted-foreground">Prototip: l'enviament és simulat.</p>
      </form>
    </GuestLayout>
  );
}
