// Comprovació del «passi» d'inici de sessió de Firebase (ID token) sense la llibreria d'autenticació de firebase-admin.
// Segueix el procediment oficial: signatura RS256 amb les claus públiques de Google, emissor i audiència del nostre projecte.
import { createRemoteJWKSet, jwtVerify, type JWTVerifyGetKey } from "jose";

const GOOGLE_KEYS = "https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com";
let remoteKeys: JWTVerifyGetKey | undefined;

/** Retorna l'identificador de la persona si el passi és vàlid; si no, null. */
export async function verifyFirebaseToken(idToken: unknown, projectId: string, getKey: JWTVerifyGetKey, now: Date = new Date()): Promise<string | null> {
  if (typeof idToken !== "string" || idToken.length < 100 || idToken.length > 4000) return null;
  try {
    const { payload } = await jwtVerify(idToken, getKey, {
      issuer: `https://securetoken.google.com/${projectId}`,
      audience: projectId,
      algorithms: ["RS256"],
      currentDate: now,
    });
    if (typeof payload.sub !== "string" || !payload.sub) return null;
    const authTime = payload["auth_time"];
    if (typeof authTime === "number" && authTime > now.getTime() / 1000 + 60) return null;
    return payload.sub;
  } catch {
    return null;
  }
}

/** Per als endpoints d'organitzadora: comprova el passi contra les claus de Google (es guarden a la memòria). */
export async function verifyAdminToken(idToken: unknown): Promise<string | null> {
  const projectId = process.env["FIREBASE_PROJECT_ID"];
  if (!projectId) return null;
  remoteKeys ??= createRemoteJWKSet(new URL(GOOGLE_KEYS));
  return verifyFirebaseToken(idToken, projectId, remoteKeys);
}
