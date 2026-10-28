import { useGuest } from "@/lib/guest-order";
import { Action } from "./primitives";

// Si el convidat ja ha enviat la comanda des d'aquest navegador, ho avisem i li deixem fer-ne una altra.
export function RecoverOrder() {
  const { submitted, newOrder } = useGuest();
  if (!submitted) return null;
  return <div className="mt-4 flex flex-wrap items-center gap-3">
    <p className="text-sm font-semibold text-primary">Ja has enviat una comanda. Pots canviar-la i desar els canvis.</p>
    <Action size="sm" variant="ghost" onClick={newOrder}>Fer una altra comanda</Action>
  </div>;
}
