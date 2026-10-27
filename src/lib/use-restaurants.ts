import { useQuery } from "@tanstack/react-query";
import { listRestaurants } from "@/lib/restaurants";

// Es reaprofita durant 5 minuts: tornar a la pantalla no torna a llegir la base de dades.
export function useRestaurants(uid: string) {
  return useQuery({ queryKey: ["restaurants", uid], queryFn: () => listRestaurants(uid), staleTime: 5 * 60 * 1000, enabled: !!uid });
}
