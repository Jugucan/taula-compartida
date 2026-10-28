// Funcions de servidor que fan servir els convidats. El navegador només les crida; el codi real és a src/server.
import { createServerFn } from "@tanstack/react-start";
import type { SendOrderInput } from "@/lib/guest-types";

export const getPublicEvent = createServerFn({ method: "POST" })
  .inputValidator((data: { code: string }) => data)
  .handler(async ({ data }) => {
    const { fetchPublicEvent } = await import("@/server/guest.server");
    try {
      return await fetchPublicEvent(data.code);
    } catch (error) {
      console.error("getPublicEvent:", error instanceof Error ? error.message : "error");
      throw new Error("No s'ha pogut carregar la trobada.");
    }
  });

export const getMyOrder = createServerFn({ method: "POST" })
  .inputValidator((data: { code: string; orderId: string; token: string }) => data)
  .handler(async ({ data }) => {
    const { fetchMyOrder } = await import("@/server/guest.server");
    try {
      return await fetchMyOrder(data.code, data.orderId, data.token);
    } catch (error) {
      console.error("getMyOrder:", error instanceof Error ? error.message : "error");
      return null;
    }
  });

export const sendOrder = createServerFn({ method: "POST" })
  .inputValidator((data: SendOrderInput) => data)
  .handler(async ({ data }) => {
    const { saveOrder } = await import("@/server/guest.server");
    try {
      return await saveOrder(data);
    } catch (error) {
      console.error("sendOrder:", error instanceof Error ? error.message : "error");
      return { ok: false as const, error: "No hem pogut desar la comanda. Torna-ho a provar." };
    }
  });
