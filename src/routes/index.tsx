import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, ChefHat, UtensilsCrossed } from "lucide-react";
import { Logo } from "@/components/app/primitives";
import hero from "@/assets/restaurant-table.jpg";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Taula · Prototip de comandes de grup" },
      { name: "description", content: "Prototip navegable: la carta per als convidats i la zona de l'organitzador." },
      { property: "og:title", content: "Taula · Prototip de comandes de grup" },
      { property: "og:description", content: "Comparteix la carta, recull comandes i obtén el resum per al restaurant." },
    ],
  }),
  component: Index,
});

const guestStates = [
  { estat: "buida", label: "Carta sense plats" },
  { estat: "error", label: "Error en carregar" },
  { estat: "tancada", label: "Comandes tancades" },
  { estat: "carregant", label: "Carregant" },
] as const;

function Index() {
  return (
    <div className="min-h-screen">
      <div className="mx-auto max-w-5xl px-5 py-8 md:py-14">
        <Logo />
        <div className="mt-10 grid items-center gap-10 md:grid-cols-[1.1fr_1fr]">
          <div className="rise">
            <p className="text-sm font-bold uppercase tracking-widest text-primary">Prototip de demostració</p>
            <h1 className="mt-3 text-4xl font-semibold leading-tight md:text-6xl">Un sopar de grup.<br />Una sola llista.</h1>
            <p className="mt-5 max-w-md text-lg text-muted-foreground">Els convidats trien a la carta des d'un enllaç. Tu reps el resum, a punt per al restaurant.</p>
          </div>
          <img src={hero} alt="Taula de restaurant amb plats per compartir" width={1600} height={912} className="aspect-[4/3] w-full rounded-3xl object-cover shadow-lift" />
        </div>

        <div className="mt-14 grid gap-5 md:grid-cols-2">
          <Link to="/carta" className="group rounded-3xl border bg-card p-7 shadow-soft transition hover:shadow-lift">
            <UtensilsCrossed className="size-8 text-primary" aria-hidden />
            <h2 className="mt-5 text-2xl font-semibold">Sóc convidat</h2>
            <p className="mt-2 text-lg text-muted-foreground">Obre la carta com si haguessis rebut l'enllaç.</p>
            <span className="mt-6 inline-flex items-center gap-2 font-bold text-primary">Veure la carta <ArrowRight className="size-5 transition group-hover:translate-x-1" /></span>
          </Link>
          <div className="rounded-3xl bg-ink p-7 text-ink-foreground shadow-soft transition hover:shadow-lift">
            <ChefHat className="size-8" aria-hidden />
            <h2 className="mt-5 text-2xl font-semibold">Sóc l'organitzador</h2>
            <p className="mt-2 text-lg opacity-80">Crea trobades, importa cartes i consulta els resums.</p>
            <span className="mt-6 inline-flex items-center gap-2 font-bold">Pendent de construir</span>
          </div>
        </div>

        <section className="mt-12">
          <h2 className="text-lg font-semibold">Altres estats de la carta</h2>
          <div className="mt-4 flex flex-wrap gap-3">
            {guestStates.map((s) => (
              <Link key={s.estat} to="/carta" search={{ estat: s.estat }} className="rounded-full border-2 border-input bg-card px-5 py-3 font-semibold hover:border-foreground/40">{s.label}</Link>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
