import { createFileRoute } from "@tanstack/react-router";
import { AdminLayout, adminHead } from "@/components/app/AdminLayout";
import { RestaurantForm } from "@/components/app/RestaurantForm";

export const Route = createFileRoute("/admin/carta")({
  head: () => adminHead("Afegir un restaurant", "Escriu el nom del restaurant i els plats de la carta."),
  component: CartaPage,
});

function CartaPage() {
  return (
    <AdminLayout title="Afegir un restaurant" subtitle="Escriu el nom i els plats. Després els podràs reutilitzar en altres trobades.">
      <RestaurantForm />
    </AdminLayout>
  );
}
