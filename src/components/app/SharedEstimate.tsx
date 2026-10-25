import { Users } from "lucide-react";
import { useOrder } from "@/lib/order-store";
import { formatEuro } from "@/lib/format";

export function SharedEstimate() {
  const { cost, extra } = useOrder();
  return <section className="my-5 border-y py-5" aria-label="Import compartit" aria-live="polite">
    <p className="flex items-center gap-2 font-semibold text-muted-foreground"><Users className="size-5" aria-hidden /> Import compartit per persona</p>
    <p className="tabular mt-2 text-3xl font-bold">{cost.count ? formatEuro(cost.perPerson) : "Pendent de comandes"}</p>
    <p className="mt-2 text-sm text-muted-foreground">Estimació amb {cost.count} comandes enviades · s'actualitza quan canvia el grup.</p>
    {extra > 0 && <p className="mt-1 text-sm text-muted-foreground">Inclou {formatEuro(extra)} per persona per a extres.</p>}
  </section>;
}