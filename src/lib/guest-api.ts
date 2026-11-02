// Funcions de servidor que fan servir els convidats. El navegador només les crida; el codi real és a src/server.
import { createServerFn } from "@tanstack/react-start";
import type { SendOrderInput } from "@/lib/guest-types";

const reason = (error: unknown) => (error instanceof Error ? error.message : "error").slice(0, 300);

export const getPublicEvent = createServerFn({ method: "POST" })
  .inputValidator((data: { code: string }) => data)
  .handler(async ({ data }) => {
    try {
      const { fetchPublicEvent } = await import("@/server/guest.server");
      return await fetchPublicEvent(data.code);
    } catch (error) {
      console.error("getPublicEvent:", reason(error));
      throw new Error("No s'ha pogut carregar la trobada.");
    }
  });

export const getMyOrder = createServerFn({ method: "POST" })
  .inputValidator((data: { code: string; orderId: string; token: string }) => data)
  .handler(async ({ data }) => {
    try {
      const { fetchMyOrder } = await import("@/server/guest.server");
      return await fetchMyOrder(data.code, data.orderId, data.token);
    } catch (error) {
      console.error("getMyOrder:", reason(error));
      return null;
    }
  });

export const sendOrder = createServerFn({ method: "POST" })
  .inputValidator((data: SendOrderInput) => data)
  .handler(async ({ data }) => {
    try {
      const { saveOrder } = await import("@/server/guest.server");
      return await saveOrder(data);
    } catch (error) {
      console.error("sendOrder:", reason(error));
      return { ok: false as const, error: "No hem pogut desar la comanda. Torna-ho a provar." };
    }
  });
