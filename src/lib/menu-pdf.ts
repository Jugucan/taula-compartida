// Extracció del text d'un PDF (al navegador). Els PDF escanejats (fotos) no tenen text i no es poden llegir.
export type PdfItem = { str: string; x: number; y: number };

/** Agrupa els fragments de text d'una pàgina en línies (de dalt a baix, d'esquerra a dreta). */
export function pdfItemsToText(pages: PdfItem[][]): string {
  const out: string[] = [];
  for (const items of pages) {
    const sorted = items.filter((i) => i.str.trim()).sort((a, b) => b.y - a.y || a.x - b.x);
    const lines: { y: number; items: PdfItem[] }[] = [];
    for (const it of sorted) {
      const line = lines.find((l) => Math.abs(l.y - it.y) <= 3);
      if (line) line.items.push(it);
      else lines.push({ y: it.y, items: [it] });
    }
    for (const l of lines.sort((a, b) => b.y - a.y)) out.push(l.items.sort((a, b) => a.x - b.x).map((i) => i.str.trim()).join(" ").replace(/\s+/g, " "));
    out.push("");
  }
  return out.join("\n").trim();
}

export async function extractPdfText(data: Uint8Array): Promise<string> {
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const worker = (await import("pdfjs-dist/legacy/build/pdf.worker.min.mjs?url")).default;
  pdfjs.GlobalWorkerOptions.workerSrc = worker;
  const doc = await pdfjs.getDocument({ data }).promise;
  const pages: PdfItem[][] = [];
  for (let p = 1; p <= Math.min(doc.numPages, 40); p++) {
    const content = await (await doc.getPage(p)).getTextContent();
    pages.push(content.items.flatMap((it) => ("str" in it ? [{ str: it.str, x: it.transform[4] as number, y: it.transform[5] as number }] : [])));
  }
  return pdfItemsToText(pages);
}
