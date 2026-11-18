// Lectura d'un Excel (.xlsx) o CSV i conversió a text de carta. El text es mostra a l'usuari abans de llegir-lo.
import { strFromU8, unzipSync } from "fflate";
import { centsToInput } from "@/lib/money";
import { parsePrice } from "@/lib/menu-import";

const MAX_ROWS = 2000;
const MAX_COLS = 30;

// ---------- Excel (.xlsx) ----------
const colIndex = (ref: string) => {
  const letters = /^[A-Z]+/i.exec(ref)?.[0].toUpperCase() ?? "A";
  return [...letters].reduce((n, ch) => n * 26 + ch.charCodeAt(0) - 64, 0) - 1;
};

function xml(text: string): Document {
  return new DOMParser().parseFromString(text, "application/xml");
}

/** Llegeix el primer full d'un .xlsx i retorna les files com a text. */
export function readXlsxRows(data: Uint8Array): string[][] {
  let files: Record<string, Uint8Array>;
  try {
    files = unzipSync(data, { filter: (f) => /^xl\/(sharedStrings\.xml|worksheets\/[^/]+\.xml)$/.test(f.name) && f.originalSize < 20_000_000 });
  } catch {
    throw new Error("No s'ha pogut obrir aquest Excel. Comprova que és un fitxer .xlsx.");
  }
  const sheetName = Object.keys(files).filter((n) => n.startsWith("xl/worksheets/")).sort()[0];
  if (!sheetName) throw new Error("Aquest Excel no té cap full amb dades.");

  const shared: string[] = [];
  const sst = files["xl/sharedStrings.xml"];
  if (sst) xml(strFromU8(sst)).querySelectorAll("si").forEach((si) => shared.push([...si.querySelectorAll("t")].map((t) => t.textContent ?? "").join("")));

  const rows: string[][] = [];
  xml(strFromU8(files[sheetName]!)).querySelectorAll("sheetData > row").forEach((row) => {
    if (rows.length >= MAX_ROWS) return;
    const cells: string[] = [];
    row.querySelectorAll("c").forEach((c) => {
      const i = colIndex(c.getAttribute("r") ?? "A1");
      if (i >= MAX_COLS) return;
      const t = c.getAttribute("t");
      let value = "";
      if (t === "s") value = shared[Number(c.querySelector("v")?.textContent)] ?? "";
      else if (t === "inlineStr") value = [...c.querySelectorAll("is t")].map((x) => x.textContent ?? "").join("");
      else value = c.querySelector("v")?.textContent ?? "";
      cells[i] = value;
    });
    rows.push(Array.from(cells, (v) => v ?? ""));
  });
  return rows;
}

// ---------- CSV ----------
export function csvToRows(text: string): string[][] {
  const lines = text.replace(/^\uFEFF/, "").split(/\r?\n/).filter((l) => l.trim());
  const sample = lines.slice(0, 5).join("\n");
  const delimiter = [";", "\t", ","].map((d) => ({ d, n: sample.split(d).length })).sort((a, b) => b.n - a.n)[0]!.d;
  return lines.slice(0, MAX_ROWS).map((line) => {
    const cells: string[] = [];
    let cur = "";
    let quoted = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i]!;
      if (quoted) {
        if (ch === '"' && line[i + 1] === '"') { cur += '"'; i++; }
        else if (ch === '"') quoted = false;
        else cur += ch;
      } else if (ch === '"') quoted = true;
      else if (ch === delimiter) { cells.push(cur); cur = ""; }
      else cur += ch;
    }
    cells.push(cur);
    return cells.slice(0, MAX_COLS);
  });
}

// ---------- Files -> text de carta ----------
const NAME_HEAD = /^(plat|plats|nom|nombre|producte|producto|article|artículo|descripci|name|item)/i;
const PRICE_HEAD = /^(preu|precio|price|import|importe|pvp|€)/i;
const CAT_HEAD = /^(categor|secci|tipus|tipo|grup|família|familia)/i;
const DESC_HEAD = /^(detall|detalle|ingredients|ingredientes|observ|nota)/i;

const cellPrice = (v: string): number | null => parsePrice(v.replace(/€|eur(os?)?/gi, "").trim());
const norm = (rows: string[][]) => rows.map((r) => r.map((c) => (c ?? "").replace(/\s+/g, " ").trim())).filter((r) => r.some(Boolean));

/** Converteix les files d'un full en text que el lector de cartes sap llegir («CATEGORIA» + «Plat 8,50 €»). */
export function rowsToMenuText(input: string[][]): string {
  const rows = norm(input);
  if (rows.length === 0) return "";

  // Capçalera? (una fila amb «plat» i «preu»)
  let nameCol = -1, priceCol = -1, catCol = -1, descCol = -1, start = 0;
  const head = rows.slice(0, 5).findIndex((r) => r.some((c) => PRICE_HEAD.test(c)) && r.some((c) => NAME_HEAD.test(c)));
  if (head !== -1) {
    const h = rows[head]!;
    priceCol = h.findIndex((c) => PRICE_HEAD.test(c));
    nameCol = h.findIndex((c, i) => NAME_HEAD.test(c) && i !== priceCol);
    catCol = h.findIndex((c) => CAT_HEAD.test(c));
    descCol = h.findIndex((c, i) => DESC_HEAD.test(c) && i !== nameCol);
    start = head + 1;
  } else {
    // Sense capçalera: la columna de preus és la que més números té; el nom, la de text més llarga de l'esquerra.
    const width = Math.max(...rows.map((r) => r.length));
    const score = Array.from({ length: width }, (_, c) => rows.filter((r) => r[c] && cellPrice(r[c]!) !== null).length);
    priceCol = score.indexOf(Math.max(...score));
    if (score[priceCol]! < 1) return rows.map((r) => r.filter(Boolean).join(" ")).join("\n");
    const textLen = Array.from({ length: priceCol }, (_, c) => rows.reduce((n, r) => n + (r[c] && cellPrice(r[c]!) === null ? r[c]!.length : 0), 0));
    nameCol = textLen.length ? textLen.indexOf(Math.max(...textLen)) : -1;
    if (nameCol === -1) return rows.map((r) => r.filter(Boolean).join(" ")).join("\n");
    if (nameCol > 0) catCol = 0;
  }
  if (nameCol === -1 || priceCol === -1) return rows.map((r) => r.filter(Boolean).join(" ")).join("\n");

  const lines: string[] = [];
  let category = "";
  for (const r of rows.slice(start)) {
    const name = r[nameCol] ?? "";
    const priceText = r[priceCol] ?? "";
    const cents = priceText ? cellPrice(priceText) : null;
    const cat = catCol !== -1 ? r[catCol] ?? "" : "";
    if (cat && cat !== category) { category = cat; lines.push(cat.toUpperCase()); }
    if (!name && r.filter(Boolean).length === 1 && !cents) { // una fila amb una sola cel·la és un títol de categoria
      const only = r.find(Boolean)!;
      if (only !== category) { category = only; lines.push(only.toUpperCase()); }
      continue;
    }
    if (!name) continue;
    if (cents === null && r.filter(Boolean).length === 1) { category = name; lines.push(name.toUpperCase()); continue; }
    lines.push(cents === null ? name : `${name} ${centsToInput(cents)} €`);
    const desc = descCol !== -1 ? r[descCol] ?? "" : "";
    if (desc) lines.push(`   ${desc}`);
  }
  return lines.join("\n");
}
