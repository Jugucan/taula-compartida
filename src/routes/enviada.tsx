import { createFileRoute, Link } from "@tanstack/react-router";
import { Check } from "lucide-react";
import { GuestLayout } from "@/components/app/GuestLayout";
import { actionVariants, StateMessage } from "@/components/app/primitives";
import { OrderLines } from "@/components/app/OrderLines";
import { demoMeetup } from "@/data/demo";
import { useOrder } from "@/lib/order-store";

export const Route = createFileRoute("/enviada")({
  head: () => ({
    meta: [
      { title: "Comanda enviada · Taula" },
      { name: "description", content: "La teva comanda per al sopar de grup." },
      { property: "og:title", content: "Comanda enviada · Taula" },
      { property: "og:description", content: "La teva comanda per al sopar de grup." },
    ],
  }),
  component: EnviadaPage,
});

function EnviadaPage() {
  const { sent, reset } = useOrder();

  if (!sent) {
    return (
      <GuestLayout>
        <StateMessage title="No hi ha cap comanda enviada" action={<Link to="/carta" className={actionVariants({ block: true })}>Anar a la carta</Link>} />
      </GuestLayout>
    );
  }

  return (
    <GuestLayout>
      <div className="rise flex flex-col items-center pb-12 pt-12 text-center">
        <div className="pop grid size-24 place-items-center rounded-full bg-success text-primary-foreground shadow-lift">
          <Check className="size-12" strokeWidth={3} aria-hidden />
        </div>
        <h1 className="mt-8 text-3xl font-semibold sm:text-4xl">Comanda enviada correctament!</h1>
        <p className="mt-3 max-w-md text-lg text-muted-foreground">
          Gràcies, {sent.guestName.split(" ")[0]}. Ja està tot fet: no cal que facis res més. Ens veiem a {demoMeetup.restaurant}.
        </p>
        <p className="mt-4 rounded-full bg-warning-soft px-4 py-1.5 text-sm font-semibold text-warning">Simulació del prototip: no s'ha enviat res de veritat</p>
        <div className="mt-8 w-full"><OrderLines lines={sent.lines} total={sent.total} /></div>
        <p className="mt-6 text-muted-foreground">Si vols canviar alguna cosa, avisa l'organitzadora abans del {demoMeetup.deadline}.</p>
        <Link to="/" onClick={reset} className={actionVariants({ variant: "outline", block: true, className: "mt-8" })}>Tornar a l'inici del prototip</Link>
      </div>
    </GuestLayout>
  );
}
