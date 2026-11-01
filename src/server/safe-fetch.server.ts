// Descàrrega SEGURA d'una pàgina web indicada per l'usuari (protecció contra SSRF):
// només http/https, ports 80/443, i mai adreces locals, privades o de metadades del núvol.
// L'adreça s'ha de comprovar també en el moment de connectar (per evitar enganys de DNS) i en cada redirecció.
import dns from "node:dns";
import http from "node:http";
import https from "node:https";
import net from "node:net";

export class SafeFetchError extends Error {
  constructor(public readonly reason: "invalid_url" | "blocked" | "unreachable" | "too_big" | "not_html" | "too_many_redirects" | "timeout", message: string) {
    super(message);
  }
}

export function isPrivateAddress(ip: string): boolean {
  if (net.isIPv4(ip)) {
    const [a = 0, b = 0] = ip.split(".").map(Number);
    return a === 0 || a === 10 || a === 127 || (a === 100 && b >= 64 && b <= 127) || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || (a === 192 && b === 0) || (a === 198 && (b === 18 || b === 19)) || a >= 224;
  }
  if (net.isIPv6(ip)) {
    const v = ip.toLowerCase();
    if (v === "::" || v === "::1") return true;
    const mapped = /^(?:0:0:0:0:0:ffff:|::ffff:)(.+)$/.exec(v);
    if (mapped) {
      const rest = mapped[1]!;
      if (net.isIPv4(rest)) return isPrivateAddress(rest);
      const parts = rest.split(":").map((h) => Number.parseInt(h, 16));
      if (parts.length === 2 && parts.every((n) => Number.isFinite(n))) return isPrivateAddress(`${parts[0]! >> 8}.${parts[0]! & 255}.${parts[1]! >> 8}.${parts[1]! & 255}`);
      return true;
    }
    return /^f[cd]/.test(v) || /^fe[89ab]/.test(v) || v.startsWith("ff") || v.startsWith("64:ff9b") || v.startsWith("2001:db8");
  }
  return true; // no és una adreça reconeixible: es bloqueja
}

export function assertSafeUrl(input: string): URL {
  if (typeof input !== "string" || input.length > 2000) throw new SafeFetchError("invalid_url", "Enllaç no vàlid.");
  let url: URL;
  try { url = new URL(input.trim()); } catch { throw new SafeFetchError("invalid_url", "Enllaç no vàlid."); }
  if (url.protocol !== "http:" && url.protocol !== "https:") throw new SafeFetchError("invalid_url", "Només s'accepten enllaços http o https.");
  if (url.username || url.password) throw new SafeFetchError("invalid_url", "Enllaç no vàlid.");
  if (url.port && url.port !== "80" && url.port !== "443") throw new SafeFetchError("blocked", "Aquest enllaç no es pot llegir.");
  const host = url.hostname.replace(/^\[|\]$/g, "").toLowerCase();
  if (!host || host === "localhost" || host.endsWith(".localhost") || host.endsWith(".local") || host.endsWith(".internal") || host.endsWith(".lan")) throw new SafeFetchError("blocked", "Aquest enllaç no es pot llegir.");
  if (net.isIP(host) && isPrivateAddress(host)) throw new SafeFetchError("blocked", "Aquest enllaç no es pot llegir.");
  if (!host.includes(".") && !net.isIP(host)) throw new SafeFetchError("invalid_url", "Enllaç no vàlid.");
  return url;
}

type LookupCb = (err: Error | null, address: string | { address: string; family: number }[], family?: number) => void;

/** DNS que rebutja qualsevol adreça privada al moment de connectar. */
function safeLookup(allowPrivate: boolean) {
  return (hostname: string, options: dns.LookupOptions, cb: LookupCb) => {
    dns.lookup(hostname, { all: true, family: options.family ?? 0 }, (err, addresses) => {
      if (err) return cb(err, "", 0);
      const ok = addresses.filter((a) => allowPrivate || !isPrivateAddress(a.address));
      if (ok.length === 0 || ok.length !== addresses.length) return cb(new SafeFetchError("blocked", "Aquest enllaç no es pot llegir."), "", 0);
      if (options.all) return cb(null, ok.map((a) => ({ address: a.address, family: a.family })));
      cb(null, ok[0]!.address, ok[0]!.family);
    });
  };
}

export type FetchOptions = { timeoutMs?: number; maxBytes?: number; maxRedirects?: number; deadline?: number; _allowPrivateForTests?: boolean };

/** Descarrega una pàgina HTML amb límits de temps, de mida i de redireccions. */
export async function safeGet(startUrl: string, opts: FetchOptions = {}): Promise<{ url: string; html: string }> {
  const { maxBytes = 1_500_000, maxRedirects = 3, _allowPrivateForTests = false } = opts;
  let current = startUrl;

  for (let hop = 0; hop <= maxRedirects; hop++) {
    const url = _allowPrivateForTests ? new URL(current) : assertSafeUrl(current);
    const remaining = opts.deadline ? opts.deadline - Date.now() : Infinity;
    const timeoutMs = Math.min(opts.timeoutMs ?? 6000, remaining);
    if (timeoutMs < 300) throw new SafeFetchError("timeout", "S'ha esgotat el temps.");

    const result = await new Promise<{ status: number; location?: string | undefined; contentType: string; body: string }>((resolve, reject) => {
      const lib = url.protocol === "https:" ? https : http;
      const req = lib.request(url, {
        method: "GET",
        lookup: safeLookup(_allowPrivateForTests) as never,
        timeout: timeoutMs,
        headers: { "user-agent": "TaulaCompartida/1.0 (lectura de cartes)", accept: "text/html,text/plain;q=0.9", "accept-encoding": "identity" },
      }, (res) => {
        const status = res.statusCode ?? 0;
        const contentType = String(res.headers["content-type"] ?? "");
        const location = typeof res.headers.location === "string" ? res.headers.location : undefined;
        if (status >= 300 && status < 400) { res.resume(); return resolve({ status, location, contentType, body: "" }); }
        if (status < 200 || status >= 300) { res.resume(); return reject(new SafeFetchError("unreachable", "No s'ha pogut obrir la pàgina.")); }
        if (!/text\/html|text\/plain|application\/xhtml/i.test(contentType)) { res.resume(); return reject(new SafeFetchError("not_html", "L'enllaç no és una pàgina web.")); }
        const chunks: Buffer[] = [];
        let size = 0;
        res.on("data", (c: Buffer) => {
          size += c.length;
          if (size > maxBytes) { req.destroy(new SafeFetchError("too_big", "La pàgina és massa gran.")); return; }
          chunks.push(c);
        });
        res.on("end", () => resolve({ status, contentType, body: Buffer.concat(chunks).toString("utf8") }));
        res.on("error", reject);
      });
      req.on("timeout", () => req.destroy(new SafeFetchError("timeout", "S'ha esgotat el temps.")));
      req.on("error", (e) => reject(e instanceof SafeFetchError ? e : new SafeFetchError("unreachable", "No s'ha pogut obrir la pàgina.")));
      req.end();
    });

    if (result.status >= 300 && result.status < 400) {
      if (!result.location) throw new SafeFetchError("unreachable", "No s'ha pogut obrir la pàgina.");
      current = new URL(result.location, url).toString(); // es torna a validar al següent pas
      continue;
    }
    return { url: url.toString(), html: result.body };
  }
  throw new SafeFetchError("too_many_redirects", "L'enllaç fa massa redireccions.");
}
