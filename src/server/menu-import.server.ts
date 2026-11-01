// Importació d'una carta des d'un enllaç: descarrega la pàgina (i, si la carta està dividida, les seves subpàgines) i en llegeix els plats.
import { parseMenuLines, type ImportedDish } from "@/lib/menu-import";
import { htmlToLines } from "@/server/html-lines.server";
import { assertSafeUrl, safeGet, SafeFetchError, type FetchOptions } from "@/server/safe-fetch.server";

export type ImportResult =
  | { ok: true; title: string; dishes: ImportedDish[]; pages: number; ignored: number; withoutPrice: number }
  | { ok: false; error: string };

const MAX_SUBPAGES = 8;
const SKIP_LINK = /contact|contacte|contacto|about|login|admin|cookie|privacy|privacitat|aviso|legal|facebook|instagram|twitter|whatsapp|mailto|tel:/i;

function friendly(e: unknown): string {
  if (e instanceof SafeFetchError) {
    switch (e.reason) {
      case "invalid_url": return "L'enllaç no sembla correcte. Comprova que l'has copiat sencer.";
      case "blocked": return "Aquest enllaç no es pot llegir.";
      case "not_html": return "Aquest enllaç no és una pàgina web amb la carta. Si és un PDF o un Excel, copia'n el text i enganxa'l.";
      case "too_big": return "La pàgina és massa gran per llegir-la. Enganxa'n el text.";
      case "timeout": return "La pàgina triga massa a respondre. Torna-ho a provar o enganxa'n el text.";
      default: return "No he pogut obrir aquesta pàgina. Torna-ho a provar o enganxa'n el text.";
    }
  }
  return "No he pogut llegir la carta d'aquesta pàgina. Enganxa'n el text.";
}

/** «PIZZES Mozzarella "Fior de Latte"…» -> «PIZZES» */
function categoryFromLinkText(text: string): string {
  const words = text.trim().split(/\s+/);
  const caps: string[] = [];
  for (const w of words) { if (w === w.toUpperCase() && /\p{L}/u.test(w)) caps.push(w); else break; }
  const base = caps.length ? caps : words.slice(0, 3);
  const joined = base.join(" ").slice(0, 40);
  return joined.charAt(0).toUpperCase() + joined.slice(1).toLowerCase();
}

export async function importFromUrl(rawUrl: string, fetchOptions: FetchOptions = {}): Promise<ImportResult> {
  const deadline = Date.now() + 9000; // la funció del servidor té poc temps: tot ha d'acabar abans
  const opts = { ...fetchOptions, deadline };
  try {
    const start = fetchOptions._allowPrivateForTests ? new URL(rawUrl) : assertSafeUrl(rawUrl);
    const first = await safeGet(start.toString(), opts);
    const page = htmlToLines(first.html);
    let parsed = parseMenuLines(page.lines);
    const dishes: ImportedDish[] = [...parsed.dishes];
    let pages = 1;
    let ignored = parsed.ignored;

    // Moltes cartes digitals tenen una portada amb enllaços a cada secció (Carta, Postres, Vins…).
    if (dishes.length < 3) {
      const base = new URL(first.url);
      const firstSegment = base.pathname.split("/").filter(Boolean)[0] ?? "";
      const seen = new Set<string>([base.toString().replace(/\/$/, "")]);
      const sub: { url: string; text: string }[] = [];
      for (const l of page.links) {
        let u: URL;
        try { u = new URL(l.href, base); } catch { continue; }
        u.hash = "";
        const key = u.toString().replace(/\/$/, "");
        if (u.hostname !== base.hostname || seen.has(key) || SKIP_LINK.test(u.toString() + " " + l.text)) continue;
        if (firstSegment && u.pathname.split("/").filter(Boolean)[0] !== firstSegment) continue;
        if (u.pathname.split("/").filter(Boolean).length <= base.pathname.split("/").filter(Boolean).length) continue;
        seen.add(key);
        sub.push({ url: u.toString(), text: l.text });
        if (sub.length >= MAX_SUBPAGES) break;
      }
      const results = await Promise.allSettled(sub.map((s) => safeGet(s.url, opts)));
      results.forEach((r, i) => {
        if (r.status !== "fulfilled") return;
        pages++;
        const p = parseMenuLines(htmlToLines(r.value.html).lines, categoryFromLinkText(sub[i]!.text) || "Altres");
        dishes.push(...p.dishes);
        ignored += p.ignored;
      });
    }

    const title = page.title.replace(/\s*[-|–·]\s*(carta|cartas?\s*y\s*men[uú]s?|men[uú]|carta digital).*$/i, "").trim();
    if (dishes.length === 0) return { ok: false, error: "No he trobat cap plat amb preu en aquesta pàgina. Prova d'enganxar el text de la carta." };
    return { ok: true, title, dishes: dishes.slice(0, 400), pages, ignored, withoutPrice: dishes.filter((d) => !d.price).length };
  } catch (e) {
    console.error("importFromUrl:", e instanceof Error ? e.message : "error");
    return { ok: false, error: friendly(e) };
  }
}
