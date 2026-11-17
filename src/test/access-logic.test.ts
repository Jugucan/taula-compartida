import { describe, expect, it } from "vitest";
import { accessScreen } from "@/lib/access-logic";

describe("què veu un compte sense accés", () => {
  it("si les sol·licituds estan obertes, es crea la sol·licitud soleta", () => {
    expect(accessScreen({ organizerStatus: null, hasRequest: false, requestsOpen: true })).toBe("create-request");
  });
  it("si ja ha demanat accés, espera (sense repetir-ho)", () => {
    expect(accessScreen({ organizerStatus: null, hasRequest: true, requestsOpen: true })).toBe("pending");
    expect(accessScreen({ organizerStatus: null, hasRequest: true, requestsOpen: false })).toBe("pending");
  });
  it("si les sol·licituds estan tancades, no pot demanar res", () => {
    expect(accessScreen({ organizerStatus: null, hasRequest: false, requestsOpen: false })).toBe("closed");
  });
  it("un compte rebutjat o suspès no pot tornar a demanar-ho (ni omplir la llista)", () => {
    expect(accessScreen({ organizerStatus: "rejected", hasRequest: false, requestsOpen: true })).toBe("rejected");
    expect(accessScreen({ organizerStatus: "suspended", hasRequest: false, requestsOpen: true })).toBe("suspended");
  });
});
