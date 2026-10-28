import { useQuery } from "@tanstack/react-query";
import { getEvent, listEvents, type StoredEvent } from "@/lib/events";

// Llista: es reaprofita 2 minuts. Detall: 5 minuts, i si la llista ja el té no es torna a llegir.
export function useEvents(uid: string) {
  return useQuery({ queryKey: ["events", uid], queryFn: () => listEvents(uid), staleTime: 2 * 60 * 1000, enabled: !!uid });
}

export function useEvent(uid: string, id: string, queryClientData?: () => StoredEvent | undefined) {
  return useQuery({
    queryKey: ["event", uid, id],
    queryFn: () => getEvent(uid, id),
    staleTime: 5 * 60 * 1000,
    enabled: !!uid,
    ...(queryClientData ? { initialData: queryClientData } : {}),
  });
}
