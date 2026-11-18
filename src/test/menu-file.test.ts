import { strToU8, zipSync } from "fflate";
import { describe, expect, it } from "vitest";
import { csvToRows, readXlsxRows, rowsToMenuText } from "@/lib/menu-file";
import { pdfItemsToText } from "@/lib/menu-pdf";
import { parseMenuText } from "@/lib/menu-import";

const dishes = (text: string) => parseMenuText(text).dishes.map((d) => [d.category, d.name, d.price]);

describe("Excel/CSV amb capçalera", () => {
  it("Categoria | Plat | Preu", () => {
    const text = rowsToMenuText([["Categoria", "Plat", "Preu"], ["Entrants", "Croquetes", "8,5"], ["Entrants", "Amanida", "9"], ["Segons", "Bistec", "15,20 €"]]);
    expect(dishes(text)).toEqual([["ENTRANTS", "Croquetes", "8,50"], ["ENTRANTS", "Amanida", "9,00"], ["SEGONS", "Bistec", "15,20"]]);
  });
  it("Nom | Descripció | Preu, amb columnes en altre ordre", () => {
    const text = rowsToMenuText([["Preu", "Nom", "Detall"], ["12.5", "Canelons", "de rostit"], ["4", "Flam", ""]]);
    const d = parseMenuText(text).dishes;
    expect(d.map((x) => [x.name, x.price])).toEqual([["Canelons", "12,50"], ["Flam", "4,00"]]);
    expect(d[0]!.description).toBe("de rostit");
  });
});

describe("Excel/CSV sense capçalera", () => {
  it("troba sola la columna de preus i la del nom", () => {
    const text = rowsToMenuText([["Pa amb tomàquet", "4,5"], ["Truita", "7"]]);
    expect(dishes(text).map((d) => [d[1], d[2]])).toEqual([["Pa amb tomàquet", "4,50"], ["Truita", "7,00"]]);
  });
  it("una fila amb una sola cel·la és una categoria", () => {
    const text = rowsToMenuText([["ENTRANTS"], ["Croquetes", "8,5"], ["POSTRES"], ["Flam", "4"]]);
    expect(dishes(text)).toEqual([["ENTRANTS", "Croquetes", "8,50"], ["POSTRES", "Flam", "4,00"]]);
  });
  it("un full sense preus es retorna com a text perquè es pugui revisar", () => {
    expect(rowsToMenuText([["Hola", "món"]])).toBe("Hola món");
    expect(rowsToMenuText([])).toBe("");
  });
});

describe("CSV", () => {
  it("detecta el separador (; , o tabulador) i les cometes", () => {
    expect(csvToRows('Plat;Preu\n"Pa; amb tomàquet";4,5')).toEqual([["Plat", "Preu"], ["Pa; amb tomàquet", "4,5"]]);
    expect(csvToRows("Plat,Preu\nFlam,4")).toEqual([["Plat", "Preu"], ["Flam", "4"]]);
    expect(csvToRows("Plat\tPreu\nFlam\t4")).toEqual([["Plat", "Preu"], ["Flam", "4"]]);
  });
});

describe("lector d'.xlsx", () => {
  const xlsx = () => zipSync({
    "xl/sharedStrings.xml": strToU8('<sst><si><t>Plat</t></si><si><t>Preu</t></si><si><r><t>Pa amb </t></r><r><t>tomàquet</t></r></si></sst>'),
    "xl/worksheets/sheet1.xml": strToU8('<worksheet><sheetData><row r="1"><c r="A1" t="s"><v>0</v></c><c r="B1" t="s"><v>1</v></c></row><row r="2"><c r="A2" t="s"><v>2</v></c><c r="C2"><v>4.5</v></c></row><row r="3"><c r="A3" t="inlineStr"><is><t>Truita</t></is></c><c r="B3"><v>7</v></c></row></sheetData></worksheet>'),
  });
  it("llegeix textos compartits, text en línia, números i cel·les buides", () => {
    expect(readXlsxRows(xlsx())).toEqual([["Plat", "Preu"], ["Pa amb tomàquet", "", "4.5"], ["Truita", "7"]]);
  });
  it("rebutja fitxers que no són un Excel", () => {
    expect(() => readXlsxRows(strToU8("això no és un excel"))).toThrow(/Excel/);
  });
});

describe("text d'un PDF", () => {
  it("agrupa els fragments en línies, de dalt a baix i d'esquerra a dreta", () => {
    const page = [
      { str: "8,50 €", x: 400, y: 700 }, { str: "Croquetes", x: 50, y: 700.5 },
      { str: "ENTRANTS", x: 50, y: 730 },
      { str: "Truita", x: 50, y: 670 }, { str: "7,00 €", x: 400, y: 670 },
    ];
    expect(pdfItemsToText([page])).toBe("ENTRANTS\nCroquetes 8,50 €\nTruita 7,00 €");
    expect(dishes(pdfItemsToText([page]))).toEqual([["ENTRANTS", "Croquetes", "8,50"], ["ENTRANTS", "Truita", "7,00"]]);
  });
});
