import { createFileRoute, Link } from "@tanstack/react-router";
import { CalendarDays, Clock, MapPin, ShoppingBag } from "lucide-react";
import { useState } from "react";
import { GuestLayout } from "@/components/app/GuestLayout";
import { actionVariants, QuantityStepper, StateMessage, Action } from "@/components/app/primitives";
import { demoMeetup, demoMenu } from "@/data/demo";
import { useOrder } from "@/lib/order-store";
import { formatEuro, plural } from "@/lib/format";
import { cn } from "@/lib/utils";

type Estat = "buida" | "error" | "tancada" | "carregant";
const estats: Estat[] = ["buida", "error", "tancada", "carregant"];

export const Route = createFileRoute("/carta")({
  validateSearch: (s: Record<string, unknown>): { estat?: Estat } =>
    estats.includes(s.estat as Estat) ? { estat: s.estat as Estat } : {},
  head: () => ({
    meta: [
      { title: `${demoMeetup.name} · Carta de ${demoMeetup.restaurant}` },
      { name: "description", content: "Tria els teus plats per al sopar de grup." },
      { property: "og:title", content: `${demoMeetup.name} · Tria el teu menú` },
      { property: "og:description", content: `Carta de ${demoMeetup.restaurant}. Tria els plats i envia la teva comanda.` },
    ],
  }),
  component: CartaPage,
});

function MeetupHeader() {
  return (
    <section className="rise pb-6 pt-8">
      <p className="text-sm font-bold uppercase tracking-widest text-primary">Ets convidat a</p>
      <h1 className="mt-2 text-3xl font-semibold leading-tight sm:text-4xl">{demoMeetup.name}</h1>
      <ul className="mt-4 space-y-2 text-lg text-muted-foreground">
        <li className="flex items-center gap-3"><MapPin className="size-5 shrink-0" aria-hidden /> {demoMeetup.restaurant}</li>
        <li className="flex items-center gap-3"><CalendarDays className="size-5 shrink-0" aria-hidden /> {demoMeetup.date}</li>
        <li className="flex items-center gap-3"><Clock className="size-5 shrink-0" aria-hidden /> Tria abans del {demoMeetup.deadline}</li>
      </ul>
    </section>
  );
}

function CartaPage() {
  const { estat } = Route.useSearch();
  const { quantities, setQty, count, total } = useOrder();
  const [active, setActive] = useState(demoMenu[0].id);

  if (estat === "carregant") {
    return (
      <GuestLayout>
        <div className="space-y-4 py-10" aria-busy="true" aria-label="Carregant la carta">
          <div className="h-4 w-32 animate-pulse rounded bg-muted" />
          <div className="h-10 w-3/4 animate-pulse rounded bg-muted" />
          <div className="h-5 w-1/2 animate-pulse rounded bg-muted" />
          {[0, 1, 2, 3].map((i) => <div key={i} className="h-24 animate-pulse rounded-2xl bg-muted" />)}
          <p className="text-center text-lg text-muted-foreground">Estem preparant la carta…</p>
        </div>
      </GuestLayout>
    );
  }
  if (estat === "error") {
    return (
      <GuestLayout>
        <StateMessage tone="error" title="No hem pogut carregar la carta" action={<Link to="/carta" className={actionVariants({ block: true })}>Tornar-ho a provar</Link>}>
          Comprova que tens connexió a internet. Si continua passant, avisa la persona que t'ha enviat l'enllaç.
        </StateMessage>
      </GuestLayout>
    );
  }
  if (estat === "tancada") {
    return (
      <GuestLayout>
        <MeetupHeader />
        <StateMessage tone="warning" title="Les comandes ja estan tancades">
          El termini va acabar el {demoMeetup.deadline}. Si encara vols venir, parla directament amb l'organitzadora.
        </StateMessage>
      </GuestLayout>
    );
  }
  if (estat === "buida") {
    return (
      <GuestLayout>
        <MeetupHeader />
        <StateMessage title="La carta encara no està a punt">
          L'organitzadora està preparant els plats. Torna a obrir aquest enllaç més tard.
        </StateMessage>
      </GuestLayout>
    );
  }

  return (
    <GuestLayout>
      <MeetupHeader />
      <nav className="sticky top-0 z-10 -mx-5 flex gap-2 overflow-x-auto border-b bg-background/95 px-5 py-3 backdrop-blur" aria-label="Categories">
        {demoMenu.map((c) => (
          <a key={c.id} href={`#${c.id}`} onClick={() => setActive(c.id)}
            className={cn("shrink-0 rounded-full px-4 py-2.5 font-semibold transition", active === c.id ? "bg-ink text-ink-foreground" : "bg-secondary text-secondary-foreground hover:bg-muted")}>
            {c.name}
          </a>
        ))}
      </nav>

      <div className="pb-40">
        {demoMenu.map((cat) => (
          <section key={cat.id} id={cat.id} className="scroll-mt-20 pt-8">
            <h2 className="text-2xl font-semibold">{cat.name}</h2>
            <ul className="mt-4 space-y-3">
              {cat.dishes.map((d) => {
                const q = quantities[d.id] ?? 0;
                return (
                  <li key={d.id} className={cn("rounded-2xl border bg-card p-5 transition", q > 0 && "border-primary/50 shadow-soft")}>
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <h3 className="font-sans text-lg font-bold leading-snug">{d.name}</h3>
                        {d.description && <p className="mt-1 text-muted-foreground">{d.description}</p>}
                        {d.tags?.map((t) => <span key={t} className="mt-2 mr-2 inline-block rounded-full bg-accent px-2.5 py-0.5 text-sm font-semibold text-accent-foreground">{t}</span>)}
                      </div>
                      <span className="tabular shrink-0 text-lg font-bold">{formatEuro(d.price)}</span>
                    </div>
                    <div className="mt-4 flex justify-end">
                      <QuantityStepper value={q} onChange={(v) => setQty(d.id, v)} label={d.name} />
                    </div>
                  </li>
                );
              })}
            </ul>
          </section>
        ))}
      </div>

      <div className="fixed inset-x-0 bottom-0 z-30 border-t bg-card/95 backdrop-blur" style={{ paddingBottom: "env(safe-area-inset-bottom)" }}>
        <div className="mx-auto flex max-w-2xl items-center gap-4 px-5 py-3">
          <div className="flex-1">
            <p className="flex items-center gap-2 text-sm font-semibold text-muted-foreground"><ShoppingBag className="size-4" aria-hidden /> La meva comanda</p>
            <p className="tabular text-lg font-bold" aria-live="polite">{count === 0 ? "Encara buida" : `${plural(count, "plat", "plats")} · ${formatEuro(total)}`}</p>
          </div>
          {count > 0 ? (
            <Link to="/revisio" className={actionVariants({ size: "lg" })}>Revisar</Link>
          ) : (
            <Action size="lg" disabled>Revisar</Action>
          )}
        </div>
      </div>
    </GuestLayout>
  );
}
