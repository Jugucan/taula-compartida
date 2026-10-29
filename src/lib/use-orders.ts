import { useQuery } from "@tanstack/react-query";
import { listOrders } from "@/lib/orders";

// No hi ha connexió contínua: es llegeix en obrir la pantalla i quan es prem «Actualitzar». Així el consum és mínim.
export function useOrders(uid: string, eventId: string | undefined) {
  return useQuery({
    queryKey: ["orders", uid, eventId],
    queryFn: () => listOrders(uid, eventId!),
    enabled: !!uid && !!eventId,
    staleTime: 30 * 1000,
    refetchOnWindowFocus: false,
  });
}
