import { createFileRoute, Link } from "@tanstack/react-router";
import { Check, Copy } from "lucide-react";
import { useState } from "react";
import { GuestLayout } from "@/components/app/GuestLayout";
import { Action, actionVariants, StateMessage } from "@/components/app/primitives";
import { OrderLines } from "@/components/app/OrderLines";
import { SharedEstimate } from "@/components/app/SharedEstimate";
import { formatDeadline } from "@/lib/events";
import { useGuest } from "@/lib/guest-order";

export const Route = createFileRoute("/t/$code/enviada")({
  component: EnviadaPage,
});

function EnviadaPage() {
  const { code, hydrated, event, submitted, lines, guestName, recoveryLink } = useGuest();
  const [copied, setCopied] = useState(false);

  if (!hydrated) return <GuestLayout><p className="py-10 text-center text-lg text-muted-foreground">Carregant…</p></GuestLayout>;
  if (!submitted || lines.length === 0) {
    return (
      <GuestLayout>
        <StateMessage title="No hi ha cap comanda enviada" action={<Link to="/t/$code" params={{ code }} className={actionVariants({ block: true })}>Anar a la carta</Link>} />
      </GuestLayout>
    );
  }

  const copy = async () => {
    try { await navigator.clipboard.writeText(recoveryLink()); setCopied(true); setTimeout(() => setCopied(false), 2500); } catch { /* L'enllaç és visible: es pot copiar a mà. */ }
  };

  return (
    <GuestLayout>
      <div className="rise flex flex-col items-center pb-12 pt-12 text-center">
        <div className="pop grid size-24 place-items-center rounded-full bg-success text-primary-foreground shadow-lift">
          <Check className="size-12" strokeWidth={3} aria-hidden />
        </div>
        <h1 className="mt-8 text-3xl font-semibold sm:text-4xl">Comanda enviada correctament!</h1>
        <p className="mt-3 max-w-md text-lg text-muted-foreground">
          Gràcies, {guestName.trim().split(" ")[0]}. Ja està tot fet: no cal que facis res més{event ? `. Ens veiem a ${event.restaurantName}` : ""}.
        </p>
        <div className="mt-8 w-full"><OrderLines lines={lines} /><SharedEstimate /></div>
        <Link to="/t/$code/revisio" params={{ code }} className={actionVariants({ block: true, className: "mt-6" })}>Editar la meva comanda</Link>
        {event && event.status === "open" && <p className="mt-4 text-muted-foreground">Pots fer canvis fins al {formatDeadline(event.deadline)}.</p>}

        <section className="mt-8 w-full rounded-2xl border bg-card p-5 text-left">
          <h2 className="font-sans text-lg font-bold">El teu enllaç personal</h2>
          <p className="mt-1 text-muted-foreground">Guarda'l si vols canviar la comanda des d'un altre mòbil o ordinador. No el comparteixis: qui el tingui pot canviar-la.</p>
          <input readOnly aria-label="Enllaç personal" value={recoveryLink()} onFocus={(e) => e.currentTarget.select()} className="mt-3 min-h-12 w-full rounded-lg border-2 border-input bg-background px-3 text-sm outline-none" />
          <Action variant="soft" size="md" className="mt-3" onClick={copy}><Copy className="size-5" aria-hidden /> {copied ? "Copiat!" : "Copiar l'enllaç"}</Action>
        </section>
      </div>
    </GuestLayout>
  );
}
