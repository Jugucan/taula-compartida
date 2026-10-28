// Estat de la comanda d'un convidat, per trobada. Les dades de la trobada vénen del servidor; la selecció és local fins que s'envia.
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import type { Dish } from "@/data/demo";
import { getMyOrder, getPublicEvent, sendOrder } from "@/lib/guest-api";
import type { PublicEvent } from "@/lib/guest-types";
import { emptySession, loadSession, parsePersonalHash, personalLink, randomToken, saveSession, type GuestSession } from "@/lib/guest-session";

export type Line = { dish: Dish; qty: number; options: string[] };
type EventState = "loading" | "error" | "notfound" | "ready";

type GuestState = {
  code: string;
  hydrated: boolean;
  eventState: EventState;
  event: PublicEvent | null;
  lines: Line[];
  count: number;
  quantities: Record<string, number>;
  selections: Record<string, string[]>;
  guestName: string;
  note: string;
  submitted: boolean;
  cost: { count: number; perPerson: number };
  extraCents: number;
  setQty: (dishId: string, qty: number) => void;
  setOption: (dishId: string, index: number, option: string) => void;
  setGuestName: (v: string) => void;
  setNote: (v: string) => void;
  send: () => Promise<{ ok: true } | { ok: false; error: string }>;
  newOrder: () => void;
  recoveryLink: () => string;
};

const GuestContext = createContext<GuestState | null>(null);

export function GuestProvider({ code, children }: { code: string; children: ReactNode }) {
  const queryClient = useQueryClient();
  const [session, setSession] = useState<GuestSession>(emptySession);
  const [hydrated, setHydrated] = useState(false);
  const sessionRef = useRef(session);
  const hydratedRef = useRef(false);
  const loadedOrderRef = useRef(false);

  // Cada canvi es desa al navegador a l'instant (també el codi de la comanda, abans d'enviar res).
  const update = (patch: Partial<GuestSession>) => {
    sessionRef.current = { ...sessionRef.current, ...patch };
    setSession(sessionRef.current);
    if (hydratedRef.current) saveSession(code, sessionRef.current);
  };

  useEffect(() => {
    let s = loadSession(code);
    // Enllaç personal (#c=...): serveix per recuperar la comanda des d'un altre mòbil.
    const personal = parsePersonalHash(window.location.hash);
    if (personal) {
      if (personal.orderId !== s.orderId || personal.token !== s.token) {
        s = { ...emptySession(), orderId: personal.orderId, token: personal.token, submitted: true };
        loadedOrderRef.current = false;
      }
      window.history.replaceState(null, "", window.location.pathname + window.location.search);
    }
    sessionRef.current = s;
    setSession(s);
    hydratedRef.current = true;
    saveSession(code, s);
    setHydrated(true);
  }, [code]);

  const query = useQuery({
    queryKey: ["public-event", code],
    queryFn: () => getPublicEvent({ data: { code } }),
    staleTime: 60 * 1000,
    retry: 1,
  });
  const event = query.data ?? null;
  const eventState: EventState = query.isError ? "error" : query.isPending ? "loading" : event ? "ready" : "notfound";

  // Si hi ha un codi personal i res triat en aquest navegador, es recupera la comanda del servidor.
  useEffect(() => {
    if (!hydrated || eventState !== "ready" || loadedOrderRef.current) return;
    const { orderId, token, quantities } = sessionRef.current;
    if (!orderId || !token) return;
    loadedOrderRef.current = true;
    if (Object.values(quantities).some((q) => q > 0)) return;
    getMyOrder({ data: { code, orderId, token } }).then((mine) => {
      if (!mine) return;
      update({
        quantities: Object.fromEntries(mine.items.map((i) => [i.dishId, i.qty])),
        selections: Object.fromEntries(mine.items.map((i) => [i.dishId, i.options])),
        guestName: mine.guestName,
        note: mine.note,
        submitted: true,
      });
    }).catch(() => undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated, eventState, code]);

  const value = useMemo<GuestState>(() => {
    const dishes = new Map((event?.menu ?? []).flatMap((c) => c.dishes).map((d) => [d.id, d]));
    const lines: Line[] = Object.entries(session.quantities).flatMap(([id, qty]) => {
      const dish = dishes.get(id);
      if (!dish || qty < 1) return [];
      const options = dish.options ? Array.from({ length: qty }, (_, i) => session.selections[id]?.[i] ?? dish.options?.values[0] ?? "") : [];
      return [{ dish, qty, options }];
    });
    const stats = event?.stats ?? { count: 0, totalCents: 0 };
    const extraCents = event?.extraCents ?? 0;

    return {
      code, hydrated, eventState, event, lines,
      count: lines.reduce((sum, l) => sum + l.qty, 0),
      quantities: session.quantities, selections: session.selections,
      guestName: session.guestName, note: session.note, submitted: session.submitted,
      cost: { count: stats.count, perPerson: stats.count ? Math.round(stats.totalCents / stats.count) + extraCents : 0 },
      extraCents,
      setQty: (id, qty) => update({ quantities: { ...sessionRef.current.quantities, [id]: Math.max(0, Math.min(20, qty)) } }),
      setOption: (id, index, option) => {
        const values = [...(sessionRef.current.selections[id] ?? [])];
        values[index] = option;
        update({ selections: { ...sessionRef.current.selections, [id]: values } });
      },
      setGuestName: (v) => update({ guestName: v }),
      setNote: (v) => update({ note: v }),
      send: async () => {
        // El codi de la comanda es crea una sola vegada i es desa abans d'enviar: si cal reintentar, no es duplica.
        if (!sessionRef.current.orderId || !sessionRef.current.token) update({ orderId: crypto.randomUUID(), token: randomToken() });
        const s = sessionRef.current;
        try {
          const result = await sendOrder({ data: { code, orderId: s.orderId, token: s.token, guestName: s.guestName, note: s.note, items: lines.map((l) => ({ dishId: l.dish.id, qty: l.qty, options: l.options })) } });
          if (!result.ok) return result;
          update({ submitted: true });
          await queryClient.invalidateQueries({ queryKey: ["public-event", code] });
          return { ok: true as const };
        } catch {
          return { ok: false as const, error: "No hem pogut desar la comanda. Comprova la connexió i torna-ho a provar: no es perdrà res." };
        }
      },
      newOrder: () => update({ ...emptySession() }),
      recoveryLink: () => personalLink(code, sessionRef.current.orderId, sessionRef.current.token),
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session, event, eventState, hydrated, code, queryClient]);

  return <GuestContext.Provider value={value}>{children}</GuestContext.Provider>;
}

export function useGuest() {
  const value = useContext(GuestContext);
  if (!value) throw new Error("useGuest s'ha de fer servir dins de GuestProvider");
  return value;
}
