import { createFileRoute, Outlet } from "@tanstack/react-router";
import { GuestProvider } from "@/lib/guest-order";

export const Route = createFileRoute("/t/$code")({
  head: () => ({
    meta: [
      { title: "Tria el teu menú · Taula" },
      { name: "description", content: "Tria els teus plats per a la trobada i envia la teva comanda." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: GuestRoot,
});

function GuestRoot() {
  const { code } = Route.useParams();
  return (
    <GuestProvider code={code}>
      <Outlet />
    </GuestProvider>
  );
}
