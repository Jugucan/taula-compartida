import { createFileRoute } from "@tanstack/react-router";
import { AdminLayout, adminHead } from "@/components/app/AdminLayout";
import { EventForm } from "@/components/app/EventForm";

export const Route = createFileRoute("/admin/nova")({
  head: () => adminHead("Crear una trobada", "Prepara una nova trobada en un minut."),
  component: NovaPage,
});

function NovaPage() {
  return (
    <AdminLayout title="Crear una trobada" subtitle="Només cal el bàsic. Podràs canviar-ho després.">
      <EventForm mode="new" />
    </AdminLayout>
  );
}
