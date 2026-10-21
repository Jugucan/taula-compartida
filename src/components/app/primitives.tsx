import { Link } from "@tanstack/react-router";
import { cva, type VariantProps } from "class-variance-authority";
import { AlertTriangle, CheckCircle2, CircleDashed, Lock, Flag, Minus, Plus, Loader2 } from "lucide-react";
import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils";
import type { MeetupStatus } from "@/data/demo";

export const actionVariants = cva(
  "inline-flex items-center justify-center gap-2 rounded-full font-semibold transition-all duration-200 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50 select-none",
  {
    variants: {
      variant: {
        primary: "bg-primary text-primary-foreground hover:bg-primary-hover shadow-soft",
        ink: "bg-ink text-ink-foreground hover:opacity-90",
        outline: "border-2 border-input bg-card text-foreground hover:border-foreground/40",
        ghost: "text-foreground hover:bg-secondary",
        soft: "bg-primary-soft text-primary hover:bg-primary-soft/70",
      },
      size: {
        lg: "min-h-14 px-7 text-lg",
        md: "min-h-12 px-5 text-base",
        sm: "min-h-10 px-4 text-sm",
      },
      block: { true: "w-full" },
    },
    defaultVariants: { variant: "primary", size: "lg" },
  },
);

type ActionProps = ButtonHTMLAttributes<HTMLButtonElement> & VariantProps<typeof actionVariants>;
export function Action({ className, variant, size, block, ...props }: ActionProps) {
  return <button className={cn(actionVariants({ variant, size, block }), className)} {...props} />;
}

const statusMap: Record<MeetupStatus, { label: string; icon: typeof Lock; cls: string }> = {
  draft: { label: "Esborrany", icon: CircleDashed, cls: "bg-secondary text-secondary-foreground" },
  open: { label: "Oberta", icon: CheckCircle2, cls: "bg-success-soft text-success" },
  closed: { label: "Tancada", icon: Lock, cls: "bg-warning-soft text-warning" },
  done: { label: "Finalitzada", icon: Flag, cls: "bg-muted text-muted-foreground" },
};

export function StatusBadge({ status }: { status: MeetupStatus }) {
  const s = statusMap[status];
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-semibold", s.cls)}>
      <s.icon className="size-4" aria-hidden /> {s.label}
    </span>
  );
}

export function QuantityStepper({ value, onChange, label }: { value: number; onChange: (v: number) => void; label: string }) {
  if (value === 0) {
    return (
      <Action variant="soft" size="md" onClick={() => onChange(1)} aria-label={`Afegir ${label}`}>
        <Plus className="size-5" aria-hidden /> Afegir
      </Action>
    );
  }
  return (
    <div className="pop inline-flex items-center rounded-full bg-primary p-1 text-primary-foreground shadow-soft" role="group" aria-label={`Quantitat de ${label}`}>
      <button className="grid size-11 place-items-center rounded-full hover:bg-primary-hover" onClick={() => onChange(value - 1)} aria-label={`Treure un ${label}`}>
        <Minus className="size-5" />
      </button>
      <span className="tabular w-8 text-center text-lg font-bold" aria-live="polite">{value}</span>
      <button className="grid size-11 place-items-center rounded-full hover:bg-primary-hover" onClick={() => onChange(value + 1)} aria-label={`Afegir un altre ${label}`}>
        <Plus className="size-5" />
      </button>
    </div>
  );
}

type Tone = "neutral" | "error" | "warning" | "success" | "loading";
const toneCls: Record<Tone, string> = {
  neutral: "bg-secondary text-muted-foreground",
  error: "bg-destructive-soft text-destructive",
  warning: "bg-warning-soft text-warning",
  success: "bg-success-soft text-success",
  loading: "bg-primary-soft text-primary",
};
const toneIcon: Record<Tone, ReactNode> = {
  neutral: <CircleDashed className="size-8" aria-hidden />,
  error: <AlertTriangle className="size-8" aria-hidden />,
  warning: <Lock className="size-8" aria-hidden />,
  success: <CheckCircle2 className="size-8" aria-hidden />,
  loading: <Loader2 className="size-8 animate-spin" aria-hidden />,
};

export function StateMessage({ tone = "neutral", title, children, action, icon }: { tone?: Tone; title: string; children?: ReactNode; action?: ReactNode; icon?: ReactNode }) {
  return (
    <div className="rise mx-auto flex max-w-md flex-col items-center px-6 py-16 text-center" role={tone === "error" ? "alert" : "status"}>
      <div className={cn("mb-6 grid size-18 place-items-center rounded-full", toneCls[tone])}>{icon ?? toneIcon[tone]}</div>
      <h2 className="text-2xl font-semibold">{title}</h2>
      {children && <div className="mt-3 text-lg text-muted-foreground">{children}</div>}
      {action && <div className="mt-8 w-full">{action}</div>}
    </div>
  );
}

export function DemoRibbon() {
  return (
    <div className="no-print bg-ink px-4 py-2 text-center text-sm text-ink-foreground">
      Prototip de demostració · les dades són d'exemple i res no s'envia de veritat ·{" "}
      <Link to="/" className="underline underline-offset-2">Índex de pantalles</Link>
    </div>
  );
}

export function Logo() {
  return (
    <span className="inline-flex items-center gap-2 font-display text-xl font-semibold">
      <span className="grid size-8 place-items-center rounded-full bg-primary text-primary-foreground text-base">t</span>
      taula
    </span>
  );
}
