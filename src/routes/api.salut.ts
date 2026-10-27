// RUTA TEMPORAL de comprovació: /api/salut
// Serveix només per verificar que el servidor es connecta a Firebase.
// Es pot esborrar quan s'hagi comprovat.
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/salut")({
  server: {
    handlers: {
      GET: async () => {
        try {
          const { getDb } = await import("@/server/firebase-admin.server");
          await getDb().doc("_salut/ping").get();
          return Response.json({ firebase: "ok" });
        } catch (error) {
          // Només registrem el missatge al servidor; al navegador no s'envia cap detall.
          console.error("Comprovació de Firebase fallida:", error instanceof Error ? error.message : "error desconegut");
          return Response.json({ firebase: "error" }, { status: 500 });
        }
      },
    },
  },
});
