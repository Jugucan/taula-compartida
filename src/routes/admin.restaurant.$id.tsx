import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { AdminLayout, adminHead } from "@/components/app/AdminLayout";
import { useAdminUid } from "@/components/app/AdminGate";
import { RestaurantForm } from "@/components/app/RestaurantForm";
import { actionVariants } from "@/components/app/primitives";
import { getRestaurant, type StoredRestaurant } from "@/lib/restaurants";

export const Route = createFileRoute("/admin/restaurant/$id")({
  head: () => adminHead("Modificar un restaurant", "Canvia el nom, els plats o els preus."),
  component: EditPage,
});

function EditPage() {
  const { id } = Route.useParams();
  return (
    <AdminLayout title="Modificar el restaurant" subtitle="Canvia el que necessitis i desa els canvis.">
      <EditLoader id={id} />
    </AdminLayout>
  );
}

function EditLoader({ id }: { id: string }) {
  const uid = useAdminUid();
  const queryClient = useQueryClient();
  const { data, isLoading, isError } = useQuery({
    queryKey: ["restaurant", uid, id],
    queryFn: () => getRestaurant(uid, id),
    staleTime: 5 * 60 * 1000,
    // Si ja s'ha carregat la llista, es reaprofita: no cal llegir res més.
    initialData: () => queryClient.getQueryData<StoredRestaurant[]>(["restaurants", uid])?.find((r) => r.id === id),
  });

  if (isLoading) return <p className="text-lg text-muted-foreground">Carregant…</p>;
  if (isError) return <p role="alert" className="rounded-2xl bg-destructive-soft p-4 text-destructive">No s'ha pogut carregar el restaurant. Torna-ho a provar d'aquí una estona.</p>;
  if (!data) {
    return (
      <div className="rounded-3xl border bg-card p-8 text-center">
        <p className="text-lg">Aquest restaurant ja no existeix.</p>
        <Link to="/admin/nova" className={actionVariants({ block: true, className: "mt-6" })}>Tornar a les trobades</Link>
      </div>
    );
  }
  return <RestaurantForm key={data.id} existing={data} />;
}
