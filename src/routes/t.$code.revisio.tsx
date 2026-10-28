import { createFileRoute, Link } from "@tanstack/react-router";
import { Trash2 } from "lucide-react";
import { GuestLayout } from "@/components/app/GuestLayout";
import { Action, actionVariants, QuantityStepper, StateMessage } from "@/components/app/primitives";
import { SharedEstimate } from "@/components/app/SharedEstimate";
import { DishOptions } from "@/components/app/DishOptions";
import { formatEuro } from "@/lib/format";
import { useGuest } from "@/lib/guest-order";

export const Route = createFileRoute("/t/$code/revisio")({
  component: RevisioPage,
});

function RevisioPage() {
  const { code, hydrated, eventState, event, lines, setQty } = useGuest();

  if (!hydrated || eventState === "loading") {
    return <GuestLayout back={{ to: "carta", label: "Tornar a la carta" }} step={1}><p className="py-10 text-center text-lg text-muted-foreground">Carregant…</p></GuestLayout>;
  }
  const total = lines.reduce((sum, l) => sum + l.dish.price * l.qty, 0);

  return (
    <GuestLayout back={{ to: "carta", label: "Tornar a la carta" }} step={1}>
      {eventState !== "ready" || event?.status !== "open" || lines.length === 0 ? (
        <StateMessage title="La teva comanda és buida" action={<Link to="/t/$code" params={{ code }} className={actionVariants({ block: true })}>Veure la carta</Link>}>
          Torna a la carta i tria els plats que vulguis.
        </StateMessage>
      ) : (
        <div className="rise pb-12 pt-8">
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
                <DishOptions dish={dish} qty={qty} />
              </li>
            ))}
          </ul>
          <p className="mt-6 flex items-baseline justify-between text-xl font-bold"><span>El teu total</span><span className="tabular">{formatEuro(total)}</span></p>
          <SharedEstimate />
          <Link to="/t/$code/dades" params={{ code }} className={actionVariants({ block: true, className: "mt-6" })}>Continuar</Link>
        </div>
      )}
    </GuestLayout>
  );
}
