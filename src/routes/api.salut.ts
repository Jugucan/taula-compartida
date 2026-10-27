// RUTA TEMPORAL de comprovació: /api/salut
// Serveix només per verificar que el servidor es connecta a Firebase.
// Mostra pistes SENSE revelar cap secret. S'esborrarà quan tot funcioni.
import { createFileRoute } from "@tanstack/react-router";

function diagnostic() {
  const key = process.env.FIREBASE_PRIVATE_KEY ?? "";
  const normalized = key.replace(/\\n/g, "\n").trim();
  let clau = "ok";
  if (!key) clau = "falta";
  else if (key.startsWith('"') || key.endsWith('"')) clau = "te cometes al principi o al final";
  else if (!normalized.startsWith("-----BEGIN PRIVATE KEY-----")) clau = "no comença com toca";
  else if (!normalized.endsWith("-----END PRIVATE KEY-----")) clau = "no acaba com toca (incompleta?)";
  return {
    FIREBASE_PROJECT_ID: process.env.FIREBASE_PROJECT_ID ? "present" : "falta",
    FIREBASE_CLIENT_EMAIL: process.env.FIREBASE_CLIENT_EMAIL ? "present" : "falta",
    FIREBASE_PRIVATE_KEY: clau,
  };
}

// Nom curt de l'error, sense dades sensibles.
function resum(error: unknown) {
  const text = error instanceof Error ? error.message : "error desconegut";
  return text.replace(/-----BEGIN[\s\S]*?(-----END[^-]*-----|$)/g, "[clau]").slice(0, 220);
}

export const Route = createFileRoute("/api/salut")({
  server: {
    handlers: {
      GET: async () => {
        const variables = diagnostic();
        try {
          const { getDb } = await import("@/server/firebase-admin.server");
          await getDb().doc("_salut/ping").get();
          return Response.json({ firebase: "ok", variables });
        } catch (error) {
          console.error("Comprovació de Firebase fallida:", resum(error));
          return Response.json({ firebase: "error", variables, motiu: resum(error) }, { status: 500 });
        }
      },
    },
  },
});
