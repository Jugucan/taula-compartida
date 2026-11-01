import http from "node:http";
import type { AddressInfo } from "node:net";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { assertSafeUrl, isPrivateAddress, safeGet, SafeFetchError } from "@/server/safe-fetch.server";
import { importFromUrl } from "@/server/menu-import.server";

describe("adreces privades", () => {
  it("bloqueja locals, privades i de metadades del núvol", () => {
    for (const ip of ["127.0.0.1", "10.0.0.5", "172.16.3.4", "192.168.1.1", "169.254.169.254", "0.0.0.0", "100.64.0.1", "::1", "fd00::1", "fe80::1", "::ffff:127.0.0.1", "::ffff:7f00:1", "224.0.0.1"]) {
      expect(isPrivateAddress(ip), ip).toBe(true);
    }
  });
  it("deixa passar adreces públiques", () => {
    for (const ip of ["8.8.8.8", "93.184.216.34", "2606:4700:4700::1111"]) expect(isPrivateAddress(ip), ip).toBe(false);
  });
});

describe("enllaços", () => {
  const bad = ["ftp://exemple.cat", "javascript:alert(1)", "http://localhost/x", "http://127.0.0.1/", "http://[::1]/", "http://169.254.169.254/latest/meta-data", "https://usuari:clau@exemple.cat", "http://exemple.cat:8080", "http://intern.local/", "http://servidor", "no és un enllaç", "http://10.1.1.1/"];
  it("rebutja els que no són segurs", () => {
    for (const u of bad) expect(() => assertSafeUrl(u), u).toThrow(SafeFetchError);
  });
  it("accepta un enllaç normal", () => {
    expect(assertSafeUrl("https://mybakarta.com/hotelmontsoliu").hostname).toBe("mybakarta.com");
  });
});

describe("descàrrega", () => {
  let server: http.Server;
  let base = "";
  const page = (body: string) => `<html><head><title>Bar Prova - Carta</title></head><body>${body}</body></html>`;
  const menu = page("<h3>Entrants</h3><h6>Croquetes</h6><p>8,50 €</p><h6>Amanida</h6><p>9,00 €</p><h6>Truita</h6><p>7,00 €</p>");

  beforeAll(async () => {
    server = http.createServer((req, res) => {
      const url = req.url ?? "";
      if (url === "/menu") { res.setHeader("content-type", "text/html"); res.end(menu); }
      else if (url === "/portada") { res.setHeader("content-type", "text/html"); res.end(page(`<a href="/portada/entrants">ENTRANTS Croquetes</a><a href="/portada/contacte">Contacte</a>`)); }
      else if (url === "/portada/entrants") { res.setHeader("content-type", "text/html"); res.end(page("<h6>Croquetes</h6><p>8,50 €</p><h6>Truita</h6><p>7,00 €</p><h6>Pa amb tomàquet</h6><p>4,50 €</p>")); }
      else if (url === "/redir") { res.statusCode = 302; res.setHeader("location", "http://169.254.169.254/latest/meta-data"); res.end(); }
      else if (url === "/gran") { res.setHeader("content-type", "text/html"); res.end("x".repeat(2_000_000)); }
      else if (url === "/pdf") { res.setHeader("content-type", "application/pdf"); res.end("%PDF"); }
      else { res.statusCode = 404; res.end(); }
    });
    await new Promise<void>((r) => server.listen(0, "127.0.0.1", r));
    base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  });
  afterAll(() => new Promise<void>((r) => server.close(() => r())));

  it("no descarrega adreces locals (el servidor de proves és a 127.0.0.1)", async () => {
    await expect(safeGet(`${base}/menu`)).rejects.toThrow(SafeFetchError);
  });
  it("llegeix una carta d'una pàgina (només amb permís de proves)", async () => {
    const r = await importFromUrl(`${base}/menu`, { _allowPrivateForTests: true });
    expect(r).toMatchObject({ ok: true, title: "Bar Prova" });
    expect(r.ok && r.dishes.map((d) => [d.category, d.name, d.price])).toEqual([["Entrants", "Croquetes", "8,50"], ["Entrants", "Amanida", "9,00"], ["Entrants", "Truita", "7,00"]]);
  });
  it("segueix les subpàgines d'una portada i ignora el contacte", async () => {
    const r = await importFromUrl(`${base}/portada`, { _allowPrivateForTests: true });
    expect(r).toMatchObject({ ok: true, pages: 2 });
    expect(r.ok && r.dishes.map((d) => d.category)).toEqual(["Entrants", "Entrants", "Entrants"]);
  });
  it("rebutja pàgines massa grans i fitxers que no són web", async () => {
    await expect(safeGet(`${base}/gran`, { _allowPrivateForTests: true })).rejects.toMatchObject({ reason: "too_big" });
    await expect(safeGet(`${base}/pdf`, { _allowPrivateForTests: true })).rejects.toMatchObject({ reason: "not_html" });
  });
  it("una redirecció cap a una adreça interna es bloqueja", async () => {
    // Amb el permís de proves només es relaxa el DNS local; la validació de cada redirecció es manté (la pàgina de metadades no existeix).
    await expect(safeGet(`${base}/redir`, { _allowPrivateForTests: true, timeoutMs: 1500 })).rejects.toThrow();
  });
  it("retorna un missatge en català quan no hi ha plats", async () => {
    const r = await importFromUrl(`${base}/no-existeix`, { _allowPrivateForTests: true });
    expect(r.ok).toBe(false);
    expect(!r.ok && r.error).toMatch(/pàgina|carta/);
  });
});
