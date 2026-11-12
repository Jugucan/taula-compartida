import { createFileRoute, Link } from "@tanstack/react-router";
import { CalendarDays, Check, Clock, MapPin, ShoppingBag } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { GuestLayout } from "@/components/app/GuestLayout";
import { actionVariants, QuantityStepper, StateMessage, Action } from "@/components/app/primitives";
import { SharedEstimate } from "@/components/app/SharedEstimate";
import { RecoverOrder } from "@/components/app/RecoverOrder";
import { formatDeadline, formatEventDate } from "@/lib/events";
import { choicesText } from "@/lib/guest-checks";
import { formatEuro, plural } from "@/lib/format";
import { useGuest } from "@/lib/guest-order";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/t/$code/")({
  component: CartaPage,
});

function MeetupHeader() {
  const { event } = useGuest();
  if (!event) return null;
  return (
    <section className="rise pb-6 pt-8">
      <p className="text-sm font-bold uppercase tracking-widest text-primary">Ets convidat a</p>
      <h1 className="mt-2 text-3xl font-semibold leading-tight sm:text-4xl">{event.name}</h1>
      <ul className="mt-4 space-y-2 text-lg text-muted-foreground">
        <li className="flex items-center gap-3"><MapPin className="size-5 shrink-0" aria-hidden /> {event.restaurantName}</li>
        <li className="flex items-center gap-3"><CalendarDays className="size-5 shrink-0" aria-hidden /> {formatEventDate(event.dateTime)}</li>
        <li className="flex items-center gap-3"><Clock className="size-5 shrink-0" aria-hidden /> Tria fins al {formatDeadline(event.deadline)}</li>
      </ul>
    </section>
  );
}

function CartaPage() {
  const { code, hydrated, eventState, event, quantities, setQty, count } = useGuest();
  const [active, setActive] = useState("");
  const navRef = useRef<HTMLElement | null>(null);

  // La categoria de dalt segueix el que s'està mirant mentre es fa scroll.
  useEffect(() => {
    if (!event || event.status !== "open" || event.menu.length === 0) return;
    const ids = event.menu.map((c) => c.id);
    let frame = 0;
    const update = () => {
      frame = 0;
      let current = ids[0] ?? "";
      for (const id of ids) {
        const el = document.getElementById(id);
        if (el && el.getBoundingClientRect().top <= 150) current = id;
      }
      if (window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 4) current = ids[ids.length - 1] ?? current;
      setActive(current);
    };
    const onScroll = () => { if (!frame) frame = requestAnimationFrame(update); };
    window.addEventListener("scroll", onScroll, { passive: true });
    update();
    return () => { window.removeEventListener("scroll", onScroll); if (frame) cancelAnimationFrame(frame); };
  }, [event]);

  // I la pestanya activa es manté visible dins de la barra de categories.
  useEffect(() => {
    const nav = navRef.current;
    const chip = active ? document.getElementById(`chip-${active}`) : null;
    if (nav && chip) nav.scrollTo({ left: chip.offsetLeft - nav.clientWidth / 2 + chip.clientWidth / 2, behavior: "smooth" });
  }, [active]);

  if (eventState === "loading" || !hydrated) {
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
  if (eventState === "error") {
    return (
      <GuestLayout>
        <StateMessage tone="error" title="No hem pogut carregar la carta" action={<Link to="/t/$code" params={{ code }} reloadDocument className={actionVariants({ block: true })}>Tornar-ho a provar</Link>}>
          Comprova que tens connexió a internet. Si continua passant, avisa la persona que t'ha enviat l'enllaç.
        </StateMessage>
      </GuestLayout>
    );
  }
  if (eventState === "notfound" || !event) {
    return (
      <GuestLayout>
        <StateMessage tone="error" title="Aquest enllaç no és correcte">
          Revisa que has obert l'enllaç sencer, o demana'n un de nou a la persona que t'ha convidat.
        </StateMessage>
      </GuestLayout>
    );
  }
  if (event.status === "draft") {
    return (
      <GuestLayout>
        <MeetupHeader />
        <StateMessage title="Encara no es pot triar">
          L'organitzadora està preparant la trobada. Torna a obrir aquest enllaç més tard.
        </StateMessage>
      </GuestLayout>
    );
  }
  if (event.status !== "open") {
    return (
      <GuestLayout>
        <MeetupHeader />
        <StateMessage tone="warning" title="Les comandes ja estan tancades">
          Ja no es poden fer canvis. Si encara vols venir, parla directament amb l'organitzadora.
        </StateMessage>
      </GuestLayout>
    );
  }
  if (event.menu.length === 0) {
    return (
      <GuestLayout>
        <MeetupHeader />
        <StateMessage title="La carta encara no està a punt">
          L'organitzadora està preparant els plats. Torna a obrir aquest enllaç més tard.
        </StateMessage>
      </GuestLayout>
    );
  }

  const current = active || event.menu[0]?.id || "";
  return (
    <GuestLayout>
      <MeetupHeader />
      <RecoverOrder />
      <SharedEstimate />
      <nav ref={navRef} className="sticky top-0 z-10 -mx-5 flex gap-2 overflow-x-auto border-b bg-background/95 px-5 py-3 backdrop-blur" aria-label="Categories">
        {event.menu.map((c) => (
          <a key={c.id} id={`chip-${c.id}`} href={`#${c.id}`} onClick={() => setActive(c.id)}
            className={cn("shrink-0 rounded-full px-4 py-2.5 font-semibold transition", current === c.id ? "bg-ink text-ink-foreground" : "bg-secondary text-secondary-foreground hover:bg-muted")}>
            {c.name}
          </a>
        ))}
      </nav>

      <div className="pb-40">
        {event.menu.map((cat) => (
          <section key={cat.id} id={cat.id} className="scroll-mt-20 pt-8">
            <h2 className="text-2xl font-semibold">{cat.name}</h2>
            <ul className="mt-4 space-y-3">
              {cat.dishes.map((d) => {
                const q = quantities[d.id] ?? 0;
                return (
                  <li key={d.id} className={cn("rounded-2xl border p-5 transition-colors duration-200", q > 0 ? "border-success bg-success text-primary-foreground shadow-lift" : "bg-card")} data-triat={q > 0 ? "si" : undefined}>
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <h3 className="font-sans text-lg font-bold leading-snug">
                          {q > 0 && <Check className="mr-1.5 -mt-1 inline size-5" strokeWidth={3} aria-label="Triat" />}
                          {d.name}
                          {choicesText(d) && <span className={cn("ml-2 font-semibold", q > 0 ? "text-accent" : "text-primary")}>({choicesText(d)})</span>}
                        </h3>
                        {d.description && <p className={cn("mt-1", q > 0 ? "text-primary-foreground/85" : "text-muted-foreground")}>{d.description}</p>}
                        {d.tags?.map((t) => <span key={t} className="mt-2 mr-2 inline-block rounded-full bg-accent px-2.5 py-0.5 text-sm font-semibold text-accent-foreground">{t}</span>)}
                      </div>
                      <span className="tabular shrink-0 text-lg font-bold">{formatEuro(d.price)}</span>
                    </div>
                    <div className="mt-4 flex justify-end">
                      <QuantityStepper value={q} onChange={(v) => setQty(d.id, v)} label={d.name} onGreen={q > 0} />
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
            <p className="tabular text-lg font-bold" aria-live="polite">{count === 0 ? "Encara buida" : plural(count, "plat", "plats")}</p>
          </div>
          {count > 0 ? (
            <Link to="/t/$code/revisio" params={{ code }} className={actionVariants({ size: "lg" })}>Revisar</Link>
          ) : (
            <Action size="lg" disabled>Revisar</Action>
          )}
        </div>
      </div>
    </GuestLayout>
  );
}
