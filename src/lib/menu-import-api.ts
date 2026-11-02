// Funció de servidor per importar una carta des d'un enllaç. Només l'organitzadora amb sessió iniciada la pot fer servir.
import { createServerFn } from "@tanstack/react-start";
import type { ImportResult } from "@/server/menu-import.server";

export type { ImportResult };

export const importMenuFromUrl = createServerFn({ method: "POST" })
  .inputValidator((data: { url: string; idToken: string }) => data)
  .handler(async ({ data }): Promise<ImportResult> => {
    const { verifyAdminToken } = await import("@/server/firebase-token.server");
    if (!(await verifyAdminToken(data.idToken))) return { ok: false, error: "Torna a iniciar la sessió per poder llegir la carta." };
    const { importFromUrl } = await import("@/server/menu-import.server");
    return importFromUrl(data.url);
  });
