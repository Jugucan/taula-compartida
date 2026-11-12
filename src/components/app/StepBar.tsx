import type { ReactNode } from "react";

// Barra fixa a la part de baix: «enrere» i «endavant» sempre al mateix lloc, un al costat de l'altre.
export function StepBar({ back, forward }: { back: ReactNode; forward: ReactNode }) {
  return (
    <div className="fixed inset-x-0 bottom-0 z-30 border-t bg-card/95 backdrop-blur" style={{ paddingBottom: "env(safe-area-inset-bottom)" }}>
      <div className="mx-auto grid max-w-2xl grid-cols-2 gap-3 px-5 py-3">{back}{forward}</div>
    </div>
  );
}
