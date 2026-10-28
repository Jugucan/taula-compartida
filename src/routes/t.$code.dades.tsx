import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { AlertCircle, Loader2 } from "lucide-react";
import { useState } from "react";
import { GuestLayout } from "@/components/app/GuestLayout";
import { Action, actionVariants, StateMessage } from "@/components/app/primitives";
import { SharedEstimate } from "@/components/app/SharedEstimate";
import { plural } from "@/lib/format";
import { useGuest } from "@/lib/guest-order";

export const Route = createFileRoute("/t/$code/dades")({
  component: DadesPage,
});

function DadesPage() {
  const { code, hydrated, eventState, event, guestName, setGuestName, note, setNote, count, send, submitted } = useGuest();
  const [error, setError] = useState(false);
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState("");
  const navigate = useNavigate();

  if (!hydrated || eventState === "loading") {
    return <GuestLayout back={{ to: "revisio", label: "Tornar" }} step={2}><p className="py-10 text-center text-lg text-muted-foreground">Carregant…</p></GuestLayout>;
  }
  if (eventState !== "ready" || event?.status !== "open" || count === 0) {
    return (
      <GuestLayout back={{ to: "carta", label: "Tornar a la carta" }}>
        <StateMessage title="Encara no has triat cap plat" action={<Link to="/t/$code" params={{ code }} className={actionVariants({ block: true })}>Veure la carta</Link>} />
      </GuestLayout>
    );
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (sending) return;
    if (guestName.trim().length < 2) { setError(true); return; }
    setSending(true);
    setSendError("");
    const result = await send();
    if (result.ok) await navigate({ to: "/t/$code/enviada", params: { code } });
    else { setSendError(result.error); setSending(false); }
  };

  return (
    <GuestLayout back={{ to: "revisio", label: "Tornar" }} step={2}>
      <form onSubmit={submit} className="rise pb-12 pt-8" noValidate>
        <h1 className="text-3xl font-semibold">Com et dius?</h1>
        <p className="mt-2 text-lg text-muted-foreground">Així l'organitzadora sabrà de qui és cada plat.</p>

        <label htmlFor="name" className="mt-8 block text-lg font-bold">El teu nom</label>
        <input id="name" value={guestName} maxLength={60} autoComplete="name" onChange={(e) => { setGuestName(e.target.value); setError(false); }}
          aria-invalid={error} aria-describedby={error ? "name-error" : undefined} placeholder="Per exemple, Maria Puig"
          className="mt-2 min-h-14 w-full rounded-xl border-2 border-input bg-card px-4 text-lg outline-none transition focus:border-primary aria-[invalid=true]:border-destructive" />
        {error && <p id="name-error" className="mt-2 flex items-center gap-2 font-semibold text-destructive"><AlertCircle className="size-5" aria-hidden /> Escriu el teu nom per continuar.</p>}

        <label htmlFor="note" className="mt-6 block text-lg font-bold">Alguna cosa a tenir en compte? <span className="font-normal text-muted-foreground">(opcional)</span></label>
        <textarea id="note" rows={3} value={note} maxLength={300} onChange={(e) => setNote(e.target.value)} placeholder="Al·lèrgies, intoleràncies…"
          className="mt-2 w-full rounded-xl border-2 border-input bg-card p-4 text-lg outline-none transition focus:border-primary" />

        <p className="mt-8 text-lg font-semibold">{plural(count, "plat", "plats")} a la teva comanda</p>
        <SharedEstimate />
        {sendError && <p role="alert" className="mb-4 rounded-2xl bg-destructive-soft p-4 font-semibold text-destructive">{sendError}</p>}
        <Action type="submit" block className="mt-2" disabled={sending}>
          {sending ? <><Loader2 className="size-5 animate-spin" aria-hidden /> Enviant…</> : submitted ? "Desar els canvis" : "Enviar comanda"}
        </Action>
      </form>
    </GuestLayout>
  );
}
