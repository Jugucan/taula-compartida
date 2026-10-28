import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, ChefHat } from "lucide-react";
import { Logo } from "@/components/app/primitives";
import hero from "@/assets/restaurant-table.jpg";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Taula · Comandes de grup" },
      { name: "description", content: "Comparteix la carta, recull comandes i obtén el resum per al restaurant." },
      { property: "og:title", content: "Taula · Comandes de grup" },
      { property: "og:description", content: "Comparteix la carta, recull comandes i obtén el resum per al restaurant." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

function Index() {
  return (
    <div className="min-h-screen">
      <div className="mx-auto max-w-5xl px-5 py-8 md:py-14">
        <Logo />
        <div className="mt-10 grid items-center gap-10 md:grid-cols-[1.1fr_1fr]">
          <div className="rise">
            <p className="text-sm font-bold uppercase tracking-widest text-primary">Comandes de grup</p>
            <h1 className="mt-3 text-4xl font-semibold leading-tight md:text-6xl">Un sopar de grup.<br />Una sola llista.</h1>
            <p className="mt-5 max-w-md text-lg text-muted-foreground">Els convidats trien a la carta des d'un enllaç. Tu reps el resum, a punt per al restaurant.</p>
          </div>
          <img src={hero} alt="Taula de restaurant amb plats per compartir" width={1600} height={912} className="aspect-[4/3] w-full rounded-3xl object-cover shadow-lift" />
        </div>

        <div className="mt-14 max-w-xl">
          <Link to="/admin" className="group block rounded-3xl bg-ink p-7 text-ink-foreground shadow-soft transition hover:shadow-lift">
            <ChefHat className="size-8" aria-hidden />
            <h2 className="mt-5 text-2xl font-semibold">Sóc l'organitzador</h2>
            <p className="mt-2 text-lg opacity-80">Crea trobades, gestiona restaurants i consulta els resums.</p>
            <span className="mt-6 inline-flex items-center gap-2 font-bold">Entrar <ArrowRight className="size-5 transition group-hover:translate-x-1" /></span>
          </Link>
          <p className="mt-6 text-lg text-muted-foreground">Si t'han convidat a una trobada, obre directament l'enllaç que t'han enviat.</p>
        </div>
      </div>
    </div>
  );
}
