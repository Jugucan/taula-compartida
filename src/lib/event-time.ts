// Estat i termini d'una trobada. Sense dependències del navegador: el fan servir també el servidor.
export type EventStatus = "draft" | "open" | "closed" | "done";

/** Data d'avui (AAAA-MM-DD) a Catalunya, tant si ho calcula el servidor com un mòbil a l'estranger. */
export function todayInMadrid(now: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Madrid", year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
}

/** El termini s'acaba quan acaba el dia límit (hora de Catalunya). */
export const deadlinePassed = (deadline: string, now: Date = new Date()) => !!deadline && todayInMadrid(now) > deadline;

/** Estat que veuen les persones: una trobada oberta es tanca sola quan s'acaba el termini. No s'escriu res a la base de dades. */
export function effectiveStatus(status: EventStatus, deadline: string, now: Date = new Date()): { status: EventStatus; autoClosed: boolean } {
  if (status === "open" && deadlinePassed(deadline, now)) return { status: "closed", autoClosed: true };
  return { status, autoClosed: false };
}
