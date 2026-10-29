// Tria quina trobada es mira a les pantalles Comandes i Resum.
import { Link, useNavigate } from "@tanstack/react-router";
import { useAdminUid } from "@/components/app/AdminGate";
import { actionVariants } from "@/components/app/primitives";
import { formatEventDate, type StoredEvent } from "@/lib/events";
import { useEvent, useEvents } from "@/lib/use-events";

export function useSelectedEvent(t: string | undefined) {
  const uid = useAdminUid();
  const list = useEvents(uid);
  const fromList = list.data?.find((e) => e.id === t) ?? (t ? undefined : list.data?.[0]);
  // Si la trobada triada no és a les 10 més recents, es llegeix a part (una lectura).
  const single = useEvent(uid, t ?? "", undefined);
  const event: StoredEvent | null | undefined = fromList ?? (t && !list.isPending ? single.data : undefined);
  const loading = list.isPending || (!!t && !fromList && single.isPending);
  return { uid, event: event ?? null, events: list.data ?? [], loading, error: list.isError };
}

export function EventPicker({ events, selected, to }: { events: StoredEvent[]; selected: string; to: "/admin/comandes" | "/admin/resum" }) {
  const navigate = useNavigate();
  if (events.length <= 1) return null;
  return (
    <div className="no-print mb-6">
      <label htmlFor="triar-trobada" className="block text-lg font-bold">Trobada</label>
      <select id="triar-trobada" value={selected} onChange={(e) => navigate({ to, search: { t: e.target.value } })} className="mt-2 min-h-14 w-full rounded-xl border-2 border-input bg-card px-4 text-lg outline-none focus:border-primary sm:max-w-lg">
        {events.map((e) => <option key={e.id} value={e.id}>{e.name} · {formatEventDate(e.dateTime)}</option>)}
      </select>
    </div>
  );
}

export function NoEvents() {
  return (
    <div className="rounded-3xl border bg-card p-8 text-center">
      <p className="text-lg">Encara no tens cap trobada.</p>
      <Link to="/admin/nova" className={actionVariants({ block: true, className: "mt-6" })}>Crear una trobada</Link>
    </div>
  );
}
