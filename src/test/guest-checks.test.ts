import { describe, expect, it } from "vitest";
import { choicesText, missingChoices } from "@/lib/guest-checks";

const macarrons = { name: "Macarrons", options: { label: "Salsa", values: ["Carbonara", "Bolonyesa", "Pesto"] } };
const flam = { name: "Flam" };

describe("plats a escollir", () => {
  it("mostra «A escollir: …» en minúscules, separat per barres", () => {
    expect(choicesText(macarrons)).toBe("A escollir: carbonara / bolonyesa / pesto");
  });
  it("un plat sense opcions no mostra res", () => {
    expect(choicesText(flam)).toBeNull();
    expect(choicesText({ options: { label: "x", values: [] } })).toBeNull();
  });
  it("detecta els plats a escollir que encara no tenen nota", () => {
    expect(missingChoices([{ dish: macarrons, note: "" }, { dish: flam, note: "" }])).toEqual(["Macarrons"]);
    expect(missingChoices([{ dish: macarrons, note: "   " }])).toEqual(["Macarrons"]);
    expect(missingChoices([{ dish: macarrons, note: "pesto" }, { dish: flam, note: "" }])).toEqual([]);
  });
});
