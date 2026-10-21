import { createFileRoute, Link } from "@tanstack/react-router";
import { Trash2 } from "lucide-react";
import { GuestLayout } from "@/components/app/GuestLayout";
import { actionVariants, QuantityStepper, StateMessage } from "@/components/app/primitives";
import { useOrder } from "@/lib/order-store";
import { formatEuro } from "@/lib/format";

export const Route = createFileRoute("/revisio")({
  head: () => ({
    meta: [
      { title: "Revisa la teva comanda · Taula" },
      { name: "description", content: "Comprova els plats i el total abans de continuar." },
      { property: "og:title", content: "Revisa la teva comanda · Taula" },
      { property: "og:description", content: "Comprova els plats i el total abans de continuar." },
    ],
  }),
  component: RevisioPage,
});

function RevisioPage() {
  const { lines, total, setQty } = useOrder();

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
                    <p className="tabular text-muted-foreground">{formatEuro(dish.price)} cadascun</p>
                  </div>
                  <span className="tabular text-lg font-bold">{formatEuro(dish.price * qty)}</span>
                </div>
                <div className="mt-4 flex items-center justify-between gap-3">
                  <button onClick={() => setQty(dish.id, 0)} className="inline-flex min-h-12 items-center gap-2 rounded-full px-3 font-semibold text-destructive hover:bg-destructive-soft">
                    <Trash2 className="size-5" aria-hidden /> Treure
                  </button>
                  <QuantityStepper value={qty} onChange={(v) => setQty(dish.id, v)} label={dish.name} />
                </div>
              </li>
            ))}
          </ul>
          <div className="mt-6 flex items-baseline justify-between rounded-2xl bg-secondary p-5">
            <span className="text-xl font-semibold">Total</span>
            <span className="tabular text-3xl font-bold">{formatEuro(total)}</span>
          </div>
          <Link to="/dades" className={actionVariants({ block: true, className: "mt-6" })}>Continuar</Link>
        </div>
      )}
    </GuestLayout>
  );
}
