import { describe, expect, it } from "vitest";
import { parseMenuLines, parseMenuText, parsePrice } from "@/lib/menu-import";
import { htmlToLines } from "@/server/html-lines.server";

// Imita l'estructura de la carta de l'exemple (mybakarta): títols per categories i per plats, descripció i preu.
const HTML = `<html><head><title>HOTEL MONTSOLIU - CARTA</title></head><body>
<nav><a href="/x">Para picar</a></nav>
<div class="menu">CARTA <div>Para picarEntrantesLa pasta</div></div>
<h3>Para picar</h3>
<div><h6>Una de bravas, bravísimas</h6><p> 6,10 € </p><hr></div>
<div><h6>Tapa "Bandolers"</h6><p>Pollo crujiente con un toque picante y salsa de curry</p><p> 8,80 € </p><hr></div>
<div><h6>Croquetas de pato del Empordá</h6><p>(Sin gluten)</p><p> 7,00 € </p><hr></div>
<h3>La pasta</h3>
<div><h6>Tagliatelle con salsa a escojer:</h6><p>Carbonara<br>A l'arrabbiata<br>Al pesto<br>Boloñesa<br>Puttanesca</p><p> 10,45 € </p><hr></div>
<div><h6>Canelones caseros de asado</h6><p> 11,35 € </p><hr></div>
<h3>Parrilla</h3>
<div><h6>(Les carnes van acompañadas de patatas fritas)</h6><hr></div>
<div><h6>Entrecot de ternera (350 gr.)</h6><p>Con salsa de setas o a la pimienta verde</p><p> 19,95 € </p><hr></div>
<div><h6>Tomahawk (por encargo)</h6><p>Ternera de Girona.<br>De 1’5 a 2,5 kg aprox.<br>Precio kg.</p><p> 58,00 € </p></div>
<footer><a href="/contact">Contacto</a></footer></body></html>`;

describe("preus", () => {
  it("entén els formats habituals", () => {
    expect(parsePrice("10,45")).toBe(1045);
    expect(parsePrice("10.5")).toBe(1050);
    expect(parsePrice("1.250,00")).toBe(125000);
    expect(parsePrice("0")).toBeNull();
    expect(parsePrice("5000")).toBeNull();
  });
});

describe("carta d'una pàgina web", () => {
  const page = htmlToLines(HTML);
  const { dishes, ignored } = parseMenuLines(page.lines);
  const find = (n: string) => dishes.find((d) => d.name.startsWith(n))!;

  it("llegeix el títol i descarta el menú de navegació i el peu", () => {
    expect(page.title).toBe("HOTEL MONTSOLIU - CARTA");
    expect(page.lines.some((l) => l.text.includes("Contacto"))).toBe(false);
  });
  it("troba totes les categories i plats amb el preu correcte", () => {
    expect(dishes).toHaveLength(7);
    expect(find("Una de bravas")).toMatchObject({ category: "Para picar", price: "6,10" });
    expect(find("Tapa")).toMatchObject({ category: "Para picar", price: "8,80", description: "Pollo crujiente con un toque picante y salsa de curry" });
    expect(find("Canelones")).toMatchObject({ category: "La pasta", price: "11,35" });
    expect(find("Entrecot").category).toBe("Parrilla");
  });
  it("detecta les opcions explícites (salses a escollir) i neteja el nom", () => {
    expect(find("Tagliatelle")).toMatchObject({ name: "Tagliatelle", optionLabel: "Salsa", optionValues: "Carbonara, A l'arrabbiata, Al pesto, Boloñesa, Puttanesca", price: "10,45" });
  });
  it("no inventa opcions on només hi ha una frase («amb salsa de bolets o pebre»)", () => {
    expect(find("Entrecot")).toMatchObject({ optionValues: "", description: "Con salsa de setas o a la pimienta verde" });
  });
  it("ignora les notes sense preu i no les converteix en categoria", () => {
    expect(ignored).toBe(1);
    expect(dishes.every((d) => !d.category.includes("carnes"))).toBe(true);
  });
  it("conserva les descripcions de diverses línies", () => {
    expect(find("Tomahawk").description).toContain("Ternera de Girona");
    expect(find("Tomahawk").price).toBe("58,00");
  });
});

describe("text enganxat", () => {
  it("«Nom … preu» amb categories en majúscules", () => {
    const r = parseMenuText(`ENTRANTS
Croquetes de pollastre ........ 8,50 €
Amanida de la casa 9,00 €
   amb formatge de cabra i nous
SEGONS
Bistec de vedella – 15,20€
Peix del dia 14 €`);
    expect(r.dishes.map((d) => [d.category, d.name, d.price])).toEqual([
      ["ENTRANTS", "Croquetes de pollastre", "8,50"],
      ["ENTRANTS", "Amanida de la casa", "9,00"],
      ["SEGONS", "Bistec de vedella", "15,20"],
      ["SEGONS", "Peix del dia", "14,00"],
    ]);
    expect(r.dishes[1]!.description).toBe("amb formatge de cabra i nous");
  });
  it("nom en una línia i preu a la següent, amb descripció", () => {
    const r = parseMenuText(`Pa amb tomàquet
4,50 €
Tapa Bandolers
Pollastre cruixent amb curri
8,80 €`);
    expect(r.dishes).toHaveLength(2);
    expect(r.dishes[1]).toMatchObject({ name: "Tapa Bandolers", price: "8,80", description: "Pollastre cruixent amb curri" });
  });
  it("deixa en blanc els preus dubtosos (dues mides) perquè es revisin", () => {
    const r = parseMenuText(`Paella de marisc
Mitja 12,00 € / Sencera 22,00 €`);
    expect(r.dishes[0]).toMatchObject({ name: "Paella de marisc", price: "", description: "Mitja 12,00 € / Sencera 22,00 €" });
    expect(r.withoutPrice).toBe(1);
    const inline = parseMenuText("Paella de marisc 12,00 € / 22,00 €");
    expect(inline.dishes[0]).toMatchObject({ name: "Paella de marisc", price: "" });
  });
  it("un text sense preus no genera plats", () => {
    expect(parseMenuText("Hola, aquesta és la nostra carta.\nBon profit!").dishes).toHaveLength(0);
  });
});
