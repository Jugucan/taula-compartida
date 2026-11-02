import { createLocalJWKSet, exportJWK, generateKeyPair, SignJWT } from "jose";
import { beforeAll, describe, expect, it } from "vitest";
import { verifyFirebaseToken } from "@/server/firebase-token.server";

const PROJECT = "taula-compartida";
const NOW = new Date("2026-11-10T10:00:00Z");
const sec = (d: Date) => Math.floor(d.getTime() / 1000);
let privateKey: CryptoKey;
let otherKey: CryptoKey;
let getKey: ReturnType<typeof createLocalJWKSet>;

async function token(over: { iss?: string; aud?: string; exp?: number; iat?: number; sub?: string | null; key?: CryptoKey; alg?: string; authTime?: number } = {}) {
  const jwt = new SignJWT({ auth_time: over.authTime ?? sec(NOW) - 60 })
    .setProtectedHeader({ alg: (over.alg ?? "RS256") as "RS256", kid: "k1" })
    .setIssuer(over.iss ?? `https://securetoken.google.com/${PROJECT}`)
    .setAudience(over.aud ?? PROJECT)
    .setIssuedAt(over.iat ?? sec(NOW) - 60)
    .setExpirationTime(over.exp ?? sec(NOW) + 3600);
  if (over.sub !== null) jwt.setSubject(over.sub ?? "uid-judith");
  return jwt.sign(over.key ?? privateKey);
}

beforeAll(async () => {
  const pair = await generateKeyPair("RS256");
  privateKey = pair.privateKey;
  otherKey = (await generateKeyPair("RS256")).privateKey;
  getKey = createLocalJWKSet({ keys: [{ ...(await exportJWK(pair.publicKey)), kid: "k1", alg: "RS256", use: "sig" }] });
});

describe("verifyFirebaseToken", () => {
  it("accepta un passi correcte i retorna l'identificador", async () => {
    expect(await verifyFirebaseToken(await token(), PROJECT, getKey, NOW)).toBe("uid-judith");
  });
  it("rebutja un passi d'un altre projecte", async () => {
    expect(await verifyFirebaseToken(await token({ aud: "un-altre-projecte", iss: "https://securetoken.google.com/un-altre-projecte" }), PROJECT, getKey, NOW)).toBeNull();
    expect(await verifyFirebaseToken(await token({ iss: "https://evil.example.com" }), PROJECT, getKey, NOW)).toBeNull();
  });
  it("rebutja un passi caducat", async () => {
    expect(await verifyFirebaseToken(await token({ exp: sec(NOW) - 10, iat: sec(NOW) - 4000 }), PROJECT, getKey, NOW)).toBeNull();
  });
  it("rebutja un passi signat amb una altra clau", async () => {
    expect(await verifyFirebaseToken(await token({ key: otherKey }), PROJECT, getKey, NOW)).toBeNull();
  });
  it("rebutja un passi sense persona i un amb data d'inici de sessió al futur", async () => {
    expect(await verifyFirebaseToken(await token({ sub: null }), PROJECT, getKey, NOW)).toBeNull();
    expect(await verifyFirebaseToken(await token({ authTime: sec(NOW) + 3600 }), PROJECT, getKey, NOW)).toBeNull();
  });
  it("rebutja text qualsevol, passis buits i passis sense signatura", async () => {
    expect(await verifyFirebaseToken("x".repeat(300), PROJECT, getKey, NOW)).toBeNull();
    expect(await verifyFirebaseToken("", PROJECT, getKey, NOW)).toBeNull();
    expect(await verifyFirebaseToken(undefined, PROJECT, getKey, NOW)).toBeNull();
    const none = `${Buffer.from('{"alg":"none"}').toString("base64url")}.${Buffer.from(JSON.stringify({ iss: `https://securetoken.google.com/${PROJECT}`, aud: PROJECT, sub: "x", exp: sec(NOW) + 999 })).toString("base64url")}.`;
    expect(await verifyFirebaseToken(none.padEnd(120, "x"), PROJECT, getKey, NOW)).toBeNull();
  });
});
