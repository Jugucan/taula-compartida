import { createFileRoute, Link } from "@tanstack/react-router";
import { Trash2 } from "lucide-react";
import { GuestLayout } from "@/components/app/GuestLayout";
import { Action, actionVariants, QuantityStepper, StateMessage } from "@/components/app/primitives";
import { useOrder } from "@/lib/order-store";
import { SharedEstimate } from "@/components/app/SharedEstimate";
import { DishOptions } from "@/components/app/DishOptions";

export const Route = createFileRoute("/revisio")({
  head: () => ({
    meta: [
      { title: "Revisa la teva comanda · Taula" },
      { name: "description", content: "Comprova els plats i el total abans de continuar." },
      { property: "og:title", content: "Revisa la teva comanda · Taula" },
      { property: "og:description", content: "Comprova els plats i el total abans de continuar." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: RevisioPage,
});

function RevisioPage() {
  const { lines, setQty } = useOrder();

  return (
    <GuestLayout back={{ to: "/carta", label: "Tornar a la carta" }} step={1}>
      {lines.length === 0 ? (
        <StateMessage title="La teva comanda és buida" action={<Link to="/carta" className={actionVariants({ block: true })}>Veure la carta</Link>}>
          Torna a la carta i prem «Afegir» als plats que vulguis.
        </StateMessage>
      ) : (
        <div className="rise pb-12 pt-8">
          <h1 className="text-3xl font-semibold">Revisa la teva comanda</h1>
          <p className="mt-2 text-lg text-muted-foreground">Pots canviar les quantitats o treure plats.</p>
          <ul className="mt-6 space-y-3">
            {lines.map(({ dish, qty }) => (
              <li key={dish.id} className="rounded-2xl border bg-card p-5">
                <div className="flex justify-between gap-4">
                  <div>
                    <h2 className="font-sans text-lg font-bold">{dish.name}</h2>
                  </div>
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
          <SharedEstimate />
          <Link to="/dades" className={actionVariants({ block: true, className: "mt-6" })}>Continuar</Link>
        </div>
      )}
    </GuestLayout>
  );
}
