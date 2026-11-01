// Lectura automàtica d'una carta a partir de text (enganxat o extret d'una pàgina web). Lògica pura, amb tests.
// No inventa mai dades: el que no es pot llegir amb seguretat (per exemple, un preu dubtós) queda en blanc per revisar.
import { centsToInput } from "@/lib/money";

export type MenuLine = { text: string; level?: number }; // level: 1-6 si és un títol (h1-h6) d'una pàgina web
export type ImportedDish = { category: string; name: string; price: string; description: string; optionLabel: string; optionValues: string };
export type ParseResult = { dishes: ImportedDish[]; ignored: number; withoutPrice: number };

const MAX_DISHES = 400;

// ---------- Preus ----------
const NUM = String.raw`\d{1,4}(?:[.,]\d{1,2})?`;
const PRICE_ONLY = new RegExp(String.raw`^(?:(?:des de|desde|a partir de|from)\s+)?(?:€\s*)?(${NUM})\s*(?:€|eur(?:os?)?)?\.?$`, "i");
const INLINE_PRICE = new RegExp(String.raw`^(.*?\S)\s*(?:\.{2,}|·|—|–|-|:)?\s*(?:€\s*)?(${NUM})\s*(?:€|eur(?:os?)?)\s*$`, "i");
const INLINE_DECIMAL = /^(.*?\S)\s+(\d{1,3}[.,]\d{2})$/;
const MANY_PRICES = /\d+[.,]\d{2}\s*(?:€|eur)[^\d]+\d+[.,]\d{2}\s*(?:€|eur)/i;

export function parsePrice(token: string): number | null {
  let t = token.replace(/\s/g, "");
  if (/^\d{1,3}(\.\d{3})+,\d{2}$/.test(t)) t = t.replace(/\./g, "");
  t = t.replace(",", ".");
  const n = Number.parseFloat(t);
  if (!Number.isFinite(n) || n <= 0 || n > 2000) return null;
  return Math.round(n * 100);
}

type PriceLine = { kind: "only"; cents: number | null; note?: string } | { kind: "inline"; name: string; cents: number | null } | null;

function readPrice(text: string): PriceLine {
  if (MANY_PRICES.test(text)) {
    // Diverses mides o preus a la mateixa línia: no se sap quin triar, així que el preu queda en blanc.
    const before = text.slice(0, text.search(/\d+[.,]\d{2}\s*(?:€|eur)|€/i)).replace(/[\s.·\-–—:]+$/, "").trim();
    return before.length > 14 ? { kind: "inline", name: before, cents: null } : { kind: "only", cents: null, note: text };
  }
  const only = PRICE_ONLY.exec(text);
  if (only && /[€]|eur|[.,]\d/i.test(text)) return { kind: "only", cents: parsePrice(only[1]!) };
  const inline = INLINE_PRICE.exec(text) ?? INLINE_DECIMAL.exec(text);
  if (inline) return { kind: "inline", name: inline[1]!.replace(/[\s.·\-–—:]+$/, ""), cents: parsePrice(inline[2]!) };
  return null;
}

// ---------- Opcions (p. ex. «Tagliatelle amb salsa a escollir:» + llista de salses) ----------
const CHOOSE = /(escollir|escoger|escojer|triar|elegir|elegeix|choose)/i;

function guessLabel(text: string): string {
  if (/salsa/i.test(text)) return "Salsa";
  if (/punt|cocci|cocción/i.test(text)) return "Punt de cocció";
  if (/guarnici|acompany|acompañ/i.test(text)) return "Acompanyament";
  return "Opció";
}

function extractOptions(name: string, desc: string[]): { name: string; desc: string[]; label: string; values: string } {
  const at = desc.findIndex((l) => CHOOSE.test(l) && /:\s*$/.test(l));
  const nameHasPrompt = CHOOSE.test(name) && /:\s*$/.test(name);
  if (at === -1 && !nameHasPrompt) return { name, desc, label: "", values: "" };

  const from = nameHasPrompt ? 0 : at + 1;
  const values: string[] = [];
  let end = from;
  for (; end < desc.length; end++) {
    const v = desc[end]!.replace(/^[-•*·\s]+/, "").trim();
    if (!v || v.length > 40 || /€/.test(v)) break;
    values.push(v);
    if (values.length >= 12) { end++; break; }
  }
  if (values.length < 2) return { name, desc, label: "", values: "" };

  const prompt = nameHasPrompt ? name : desc[at]!;
  const cleanName = nameHasPrompt ? name.replace(/\s+(?:con|amb|with)\s+\w+\s+a\s+\w+\s*:?\s*$/i, "").replace(/\s+a\s+(?:escollir|escoger|escojer|triar|elegir)\s*:?\s*$/i, "").replace(/:\s*$/, "").trim() : name;
  const rest = nameHasPrompt ? desc.slice(end) : [...desc.slice(0, at), ...desc.slice(end)];
  return { name: cleanName || name, desc: rest, label: guessLabel(prompt + " " + name), values: values.join(", ") };
}

// ---------- Construcció dels plats ----------
const clean = (s: string) => s.replace(/\s+/g, " ").trim();

function makeDish(category: string, name: string, desc: string[], cents: number | null): ImportedDish | null {
  const n = clean(name).replace(/^[-•*·\s]+/, "");
  if (!n) return null;
  const o = extractOptions(n, desc.map(clean).filter(Boolean));
  return {
    category: clean(category).slice(0, 40) || "Altres",
    name: o.name.slice(0, 80),
    price: cents === null ? "" : centsToInput(cents),
    description: o.desc.join(" ").slice(0, 200),
    optionLabel: o.label,
    optionValues: o.values,
  };
}

const looksLikeCategory = (t: string) => {
  const letters = t.replace(/[^\p{L}]/gu, "");
  return t.length <= 40 && !/\d|€/.test(t) && letters.length >= 3 && (t === t.toUpperCase() || /:\s*$/.test(t));
};
const isNote = (t: string) => /^\(.*\)$/.test(t.trim());

/** Detecta el nivell de títol que fan servir els noms dels plats (el que va seguit d'un preu). */
function detectDishLevel(lines: MenuLine[]): number | undefined {
  const counts = new Map<number, number>();
  let open: number | undefined;
  for (const l of lines) {
    const price = readPrice(l.text);
    if (l.level !== undefined) {
      if (price?.kind === "inline") counts.set(l.level, (counts.get(l.level) ?? 0) + 1);
      else open = l.level;
    } else if (price && open !== undefined) {
      counts.set(open, (counts.get(open) ?? 0) + 1);
      open = undefined;
    }
  }
  let best: number | undefined;
  for (const [level, n] of counts) if (best === undefined || n > (counts.get(best) ?? 0)) best = level;
  return best;
}

export function parseMenuLines(input: MenuLine[], defaultCategory = "Altres"): ParseResult {
  const lines = input.map((l) => ({ ...l, text: clean(l.text) })).filter((l) => l.text && !/^[-*_=\s]{3,}$/.test(l.text));
  const dishes: ImportedDish[] = [];
  let ignored = 0;
  let category = defaultCategory;
  const dishLevel = detectDishLevel(lines);
  const push = (d: ImportedDish | null) => { if (d && dishes.length < MAX_DISHES) dishes.push(d); };

  if (dishLevel !== undefined) {
    // Pàgina amb títols: els títols de nivell superior són categories i els del nivell dels plats són noms.
    const hasHigher = lines.some((l) => l.level !== undefined && l.level < dishLevel);
    let cur: { name: string; desc: string[] } | null = null;
    const dropCur = () => {
      if (cur) {
        if (!hasHigher && !isNote(cur.name) && cur.desc.length === 0) category = cur.name; // estructura plana: un títol sol és una categoria
        else ignored++;
      }
      cur = null;
    };
    for (const l of lines) {
      const price = readPrice(l.text);
      if (l.level !== undefined && l.level < dishLevel) { dropCur(); category = l.text; continue; }
      if (l.level !== undefined) {
        if (price?.kind === "inline") { dropCur(); push(makeDish(category, price.name, [], price.cents)); continue; }
        dropCur();
        cur = { name: l.text, desc: [] };
        continue;
      }
      if (!cur) continue;
      if (price?.kind === "only") { push(makeDish(category, cur.name, price.note ? [...cur.desc, price.note] : cur.desc, price.cents)); cur = null; }
      else if (price?.kind === "inline") { push(makeDish(category, cur.name, [...cur.desc, price.name], price.cents)); cur = null; }
      else cur.desc.push(l.text);
    }
    dropCur();
  } else {
    // Text sense estructura: «Nom … preu» en una línia, o nom i preu en línies seguides.
    let pending: string[] = [];
    let last: ImportedDish | null = null;
    const setCategory = (t: string) => { category = t.replace(/:\s*$/, ""); last = null; };
    const absorb = (items: string[]) => { // línies sense preu abans d'un plat amb preu en la mateixa línia
      for (const t of items) {
        if (looksLikeCategory(t)) setCategory(t);
        else if (last && !isNote(t)) last.description = clean(`${last.description} ${t}`).slice(0, 200);
        else ignored++;
      }
    };
    for (const l of lines) {
      if (l.level !== undefined && !/\d{1,3}[.,]\d{2}/.test(l.text)) { absorb(pending); pending = []; setCategory(l.text); continue; }
      const price = readPrice(l.text);
      if (!price) { pending.push(l.text); continue; }
      if (price.kind === "inline") {
        absorb(pending); pending = [];
        last = makeDish(category, price.name, [], price.cents);
        push(last);
      } else {
        // preu en línia pròpia: el nom és la primera línia pendent que no sigui una categoria
        const cats = [];
        while (pending.length > 1 && looksLikeCategory(pending[0]!)) cats.push(pending.shift()!);
        cats.forEach(setCategory);
        const name = pending.shift();
        if (name) { last = makeDish(category, name, price.note ? [...pending, price.note] : pending, price.cents); push(last); }
        pending = [];
      }
    }
    absorb(pending);
  }

  return { dishes, ignored, withoutPrice: dishes.filter((d) => !d.price).length };
}

/** Text enganxat (de la web, d'un PDF, d'un correu…). */
export function parseMenuText(text: string): ParseResult {
  return parseMenuLines(text.split(/\r?\n/).map((t) => ({ text: t })));
}
