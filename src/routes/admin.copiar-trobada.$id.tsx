import { createFileRoute, Link } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { AdminLayout, adminHead } from "@/components/app/AdminLayout";
import { useAdminUid } from "@/components/app/AdminGate";
import { EventForm } from "@/components/app/EventForm";
import { actionVariants } from "@/components/app/primitives";
import type { StoredEvent } from "@/lib/events";
import { useEvent } from "@/lib/use-events";

export const Route = createFileRoute("/admin/copiar-trobada/$id")({
  head: () => adminHead("Copiar la trobada", "Crea una trobada nova a partir d'aquesta. Només cal triar les dates noves."),
  component: CopiarPage,
});

function CopiarPage() {
  const { id } = Route.useParams();
  return (
    <AdminLayout title="Copiar la trobada" subtitle="Crea una trobada nova a partir d'aquesta. Només cal triar les dates noves.">
      <Loader id={id} />
    </AdminLayout>
  );
}

function Loader({ id }: { id: string }) {
  const uid = useAdminUid();
  const queryClient = useQueryClient();
  const { data, isLoading, isError } = useEvent(uid, id, () => queryClient.getQueryData<StoredEvent[]>(["events", uid])?.find((e) => e.id === id));

  if (isLoading) return <p className="text-lg text-muted-foreground">Carregant…</p>;
  if (isError) return <p role="alert" className="rounded-2xl bg-destructive-soft p-4 text-destructive">No s'ha pogut carregar la trobada. Torna-ho a provar d'aquí una estona.</p>;
  if (!data) {
    return (
      <div className="rounded-3xl border bg-card p-8 text-center">
        <p className="text-lg">Aquesta trobada no existeix.</p>
        <Link to="/admin" className={actionVariants({ block: true, className: "mt-6" })}>Tornar a l'inici</Link>
      </div>
    );
  }
  return <EventForm key={data.id} mode="copy" source={data} />;
}
