// Memòria del navegador del convidat (per trobada): què ha triat, el seu nom i el codi personal de la comanda.
export type GuestSession = {
  quantities: Record<string, number>;
  selections: Record<string, string[]>;
  guestName: string;
  note: string;
  orderId: string; // identificador de la comanda (el genera el navegador una sola vegada)
  token: string; // codi personal i secret d'aquesta comanda
  submitted: boolean;
};

export const emptySession = (): GuestSession => ({ quantities: {}, selections: {}, guestName: "", note: "", orderId: "", token: "", submitted: false });
const key = (code: string) => `taula-convidat-v1:${code}`;

export function loadSession(code: string): GuestSession {
  try {
    const raw = localStorage.getItem(key(code));
    if (!raw) return emptySession();
    const s = JSON.parse(raw) as Partial<GuestSession>;
    return {
      quantities: typeof s.quantities === "object" && s.quantities ? s.quantities : {},
      selections: typeof s.selections === "object" && s.selections ? s.selections : {},
      guestName: typeof s.guestName === "string" ? s.guestName : "",
      note: typeof s.note === "string" ? s.note : "",
      orderId: typeof s.orderId === "string" ? s.orderId : "",
      token: typeof s.token === "string" ? s.token : "",
      submitted: s.submitted === true,
    };
  } catch {
    return emptySession();
  }
}

export function saveSession(code: string, session: GuestSession) {
  try {
    localStorage.setItem(key(code), JSON.stringify(session));
  } catch {
    /* Sense memòria del navegador: l'app continua funcionant durant la sessió. */
  }
}

/** Codi aleatori de 256 bits en base64url (43 caràcters). */
export function randomToken(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return btoa(String.fromCharCode(...bytes)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

/** Enllaç personal: porta el codi a la part després de «#», que no s'envia mai a cap servidor. */
export const personalLink = (code: string, orderId: string, token: string) => `${window.location.origin}/t/${code}#c=${orderId}.${token}`;

export function parsePersonalHash(hash: string): { orderId: string; token: string } | null {
  const m = /^#c=([A-Za-z0-9-]{8,64})\.([A-Za-z0-9_-]{32,128})$/.exec(hash);
  return m ? { orderId: m[1]!, token: m[2]! } : null;
}
