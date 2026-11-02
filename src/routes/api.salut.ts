// RUTA TEMPORAL de diagnòstic: /api/salut?c=CODI
// Comprova, pas a pas, el mateix camí que fan servir els convidats. No mostra cap secret. S'esborrarà quan tot funcioni.
import { createFileRoute } from "@tanstack/react-router";

const short = (e: unknown) => (e instanceof Error ? e.message : "error").replace(/-----BEGIN[\s\S]*?(-----END[^-]*-----|$)/g, "[clau]").slice(0, 220);

async function step<T>(out: Record<string, unknown>, name: string, fn: () => Promise<T>): Promise<T | undefined> {
  try {
    const value = await fn();
    out[name] = value === undefined || typeof value === "object" || typeof value === "function" ? "ok" : value;
    return value;
  } catch (e) {
    out[name] = `ERROR: ${short(e)}`;
    return undefined;
  }
}

export const Route = createFileRoute("/api/salut")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const out: Record<string, unknown> = {};
        const code = new URL(request.url).searchParams.get("c") ?? "";

        out["variables"] = {
          FIREBASE_PROJECT_ID: process.env["FIREBASE_PROJECT_ID"] ? "present" : "falta",
          FIREBASE_CLIENT_EMAIL: process.env["FIREBASE_CLIENT_EMAIL"] ? "present" : "falta",
          FIREBASE_PRIVATE_KEY: process.env["FIREBASE_PRIVATE_KEY"] ? "present" : "falta",
        };
        out["node"] = process.version;

        const admin = await step(out, "1_carregar_firebase_admin", async () => import("@/server/firebase-admin.server"));
        await step(out, "2_carregar_part_d_autenticacio", async () => { await import("firebase-admin/auth"); });
        const guest = await step(out, "3_carregar_servidor_dels_convidats", async () => import("@/server/guest.server"));

        if (admin && /^[a-z2-9]{16}$/.test(code)) {
          const db = admin.getDb();
          const link = await step(out, "4_llegir_enllac", async () => (await db.doc(`links/${code}`).get()).data() as { wsId: string; eventId: string } | undefined);
          out["4_llegir_enllac"] = link ? "existeix" : out["4_llegir_enllac"] === "ok" || out["4_llegir_enllac"] === undefined ? "no existeix" : out["4_llegir_enllac"];
          if (link) await step(out, "5_llegir_trobada", async () => { const s = await db.doc(`workspaces/${link.wsId}/events/${link.eventId}`).get(); return s.exists ? `existeix, estat: ${String(s.data()?.["status"])}` : "no existeix"; });
          if (guest) await step(out, "6_resultat_per_als_convidats", async () => { const e = await guest.fetchPublicEvent(code); return e ? `estat: ${e.status}, plats a la carta: ${e.menu.reduce((n, c) => n + c.dishes.length, 0)}` : "cap trobada"; });
        } else {
          out["nota"] = "Afegeix ?c=EL_CODI_DE_L_ENLLAÇ al final de l'adreça per provar també la trobada.";
        }
        return Response.json(out);
      },
    },
  },
});
