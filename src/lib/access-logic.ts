// Què veu un compte que ha iniciat sessió però encara no té accés. Lògica pura, amb tests.
export type MyAccess = { organizerStatus: "active" | "suspended" | "rejected" | null; hasRequest: boolean; requestsOpen: boolean };
export type AccessScreen = "suspended" | "rejected" | "pending" | "create-request" | "closed";

export function accessScreen({ organizerStatus, hasRequest, requestsOpen }: MyAccess): AccessScreen {
  if (organizerStatus === "suspended") return "suspended";
  if (organizerStatus === "rejected") return "rejected";
  if (hasRequest) return "pending";
  // Si les sol·licituds estan obertes, la sol·licitud es fa soleta: no cal tornar a demanar res.
  return requestsOpen ? "create-request" : "closed";
}
