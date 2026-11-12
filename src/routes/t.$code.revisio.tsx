import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { AlertCircle, Trash2 } from "lucide-react";
import { useState } from "react";
import { GuestLayout } from "@/components/app/GuestLayout";
import { StepBar } from "@/components/app/StepBar";
import { Action, actionVariants, QuantityStepper, StateMessage } from "@/components/app/primitives";
import { SharedEstimate } from "@/components/app/SharedEstimate";
import { DishNote } from "@/components/app/DishNote";
import { formatEuro } from "@/lib/format";
import { missingChoices } from "@/lib/guest-checks";
import { useGuest } from "@/lib/guest-order";

export const Route = createFileRoute("/t/$code/revisio")({
  component: RevisioPage,
});

function RevisioPage() {
  const { code, hydrated, eventState, event, lines, setQty } = useGuest();
  const navigate = useNavigate();
  const [tried, setTried] = useState(false);
  const missing = missingChoices(lines);

  if (!hydrated || eventState === "loading") {
    return <GuestLayout step={1}><p className="py-10 text-center text-lg text-muted-foreground">Carregant…</p></GuestLayout>;
  }
  const total = lines.reduce((sum, l) => sum + l.dish.price * l.qty, 0);

  return (
    <GuestLayout step={1}>
      {eventState !== "ready" || event?.status !== "open" || lines.length === 0 ? (
        <StateMessage title="La teva comanda és buida" action={<Link to="/t/$code" params={{ code }} className={actionVariants({ block: true })}>Veure la carta</Link>}>
          Torna a la carta i tria els plats que vulguis.
        </StateMessage>
      ) : (
        <div className="rise pb-32 pt-8">
          <h1 className="text-3xl font-semibold">Revisa la teva comanda</h1>
          <p className="mt-2 text-lg text-muted-foreground">Pots canviar les quantitats o treure plats.</p>
          <ul className="mt-6 space-y-3">
            {lines.map(({ dish, qty }) => (
              <li key={dish.id} className="rounded-2xl border bg-card p-5">
                <div className="flex justify-between gap-4">
                  <h2 className="font-sans text-lg font-bold">{dish.name}</h2>
                  <span className="tabular shrink-0 text-lg font-bold">{formatEuro(dish.price * qty)}</span>
                </div>
                <div className="mt-4 flex items-center justify-between gap-3">
                  <Action variant="ghost" size="md" onClick={() => setQty(dish.id, 0)} className="text-destructive hover:bg-destructive-soft">
                    <Trash2 className="size-5" aria-hidden /> Treure
                  </Action>
                  <QuantityStepper value={qty} onChange={(v) => setQty(dish.id, v)} label={dish.name} />
                </div>
                <DishNote dish={dish} qty={qty} invalid={tried && missing.includes(dish.name)} />
              </li>
            ))}
          </ul>
          <p className="mt-6 flex items-baseline justify-between text-xl font-bold"><span>El teu total</span><span className="tabular">{formatEuro(total)}</span></p>
          <SharedEstimate />
          {tried && missing.length > 0 && (
            <p role="alert" className="mt-6 flex items-start gap-2 rounded-2xl bg-destructive-soft p-4 font-semibold text-destructive">
              <AlertCircle className="mt-0.5 size-5 shrink-0" aria-hidden /> Abans de continuar, escull què vols a: {missing.join(", ")}.
            </p>
          )}
          <StepBar
            back={<Link to="/t/$code" params={{ code }} className={actionVariants({ variant: "outline", block: true })}>Enrere</Link>}
            forward={<Action block onClick={() => { if (missing.length > 0) setTried(true); else void navigate({ to: "/t/$code/dades", params: { code } }); }}>Continuar</Action>}
          />
        </div>
      )}
    </GuestLayout>
  );
}
