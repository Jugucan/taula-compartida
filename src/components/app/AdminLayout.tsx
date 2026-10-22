import { Link } from "@tanstack/react-router";
import { Home, ListChecks, PlusCircle, Receipt } from "lucide-react";
import type { ReactNode } from "react";
import { DemoRibbon, Logo } from "./primitives";

const nav = [
  { to: "/admin", label: "Inici", icon: Home },
  { to: "/admin/nova", label: "Crear", icon: PlusCircle },
  { to: "/admin/comandes", label: "Comandes", icon: ListChecks },
  { to: "/admin/resum", label: "Resum", icon: Receipt },
] as const;

export function AdminLayout({ children, title, subtitle, actions }: { children: ReactNode; title: string; subtitle?: string; actions?: ReactNode }) {
  return (
    <div className="min-h-screen pb-24 md:pb-0">
      <DemoRibbon />
      <header className="no-print border-b bg-card">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-5 py-4">
          <Link to="/admin" aria-label="Inici"><Logo /></Link>
          <nav className="hidden gap-1 md:flex" aria-label="Principal">
            {nav.map((n) => (
              <Link key={n.to} to={n.to} activeOptions={{ exact: true }} className="rounded-full px-4 py-2 font-semibold text-muted-foreground hover:text-foreground data-[status=active]:bg-secondary data-[status=active]:text-foreground">
                {n.label}
              </Link>
            ))}
          </nav>
          <span className="grid size-10 place-items-center rounded-full bg-accent font-semibold text-accent-foreground" aria-label="Organitzadora: Laia">L</span>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-5 py-8 md:py-12">
        <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="text-3xl font-semibold md:text-4xl">{title}</h1>
            {subtitle && <p className="mt-2 text-lg text-muted-foreground">{subtitle}</p>}
          </div>
          {actions}
        </div>
        {children}
      </main>
      <nav className="no-print fixed inset-x-0 bottom-0 z-30 grid grid-cols-4 border-t bg-card md:hidden" aria-label="Principal">
        {nav.map((n) => (
          <Link key={n.to} to={n.to} activeOptions={{ exact: true }} className="flex min-h-16 flex-col items-center justify-center gap-1 text-sm font-semibold text-muted-foreground data-[status=active]:text-primary">
            <n.icon className="size-6" aria-hidden /> {n.label}
          </Link>
        ))}
      </nav>
    </div>
  );
}

export function adminHead(title: string, description: string) {
  return {
    meta: [
      { title: `${title} · Taula` },
      { name: "description", content: description },
      { property: "og:title", content: `${title} · Taula` },
      { property: "og:description", content: description },
    ],
  };
}
