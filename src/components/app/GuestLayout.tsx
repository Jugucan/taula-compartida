import { Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import type { ReactNode } from "react";
import { DemoRibbon } from "./primitives";

export function GuestLayout({ children, back, step }: { children: ReactNode; back?: { to: "/carta" | "/revisio"; label: string }; step?: number }) {
  return (
    <div className="min-h-screen">
      <DemoRibbon />
      {(back || step) && (
        <header className="sticky top-0 z-20 border-b bg-background/90 backdrop-blur">
          <div className="mx-auto flex max-w-2xl items-center justify-between px-5 py-3">
            {back ? (
              <Link to={back.to} className="inline-flex min-h-12 items-center gap-2 rounded-full pr-3 text-base font-semibold hover:text-primary">
                <ArrowLeft className="size-5" aria-hidden /> {back.label}
              </Link>
            ) : <span />}
            {step && <span className="text-sm font-semibold text-muted-foreground">Pas {step} de 3</span>}
          </div>
        </header>
      )}
      <main className="mx-auto max-w-2xl px-5">{children}</main>
    </div>
  );
}
