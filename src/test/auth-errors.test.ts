import { describe, expect, it } from "vitest";
import { authErrorMessage } from "@/lib/auth-errors";

describe("authErrorMessage", () => {
  it("explica els errors habituals amb paraules normals", () => {
    expect(authErrorMessage("auth/invalid-credential")).toContain("no són correctes");
    expect(authErrorMessage("auth/invalid-email")).toContain("correu");
    expect(authErrorMessage("auth/too-many-requests")).toContain("massa intents");
    expect(authErrorMessage("auth/network-request-failed")).toContain("connexió");
  });
  it("no ensenya mai codis tècnics", () => {
    expect(authErrorMessage("auth/qualsevol-cosa")).not.toContain("auth/");
    expect(authErrorMessage(undefined)).not.toContain("undefined");
  });
});
