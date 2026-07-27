import type { HTMLAttributes } from "react";

type Variant = "neutral" | "accent" | "solid";
type Size = "sm" | "md";

const shape = "inline-flex items-center gap-1 rounded-full font-medium";

const variants: Record<Variant, string> = {
  neutral: "border border-border bg-surface-secondary text-muted-foreground",
  accent: "bg-accent text-primary",
  solid: "bg-primary text-primary-foreground shadow-sm",
};

const sizes: Record<Size, string> = {
  sm: "px-2 py-1 text-xs",
  md: "px-3 py-1.5 text-sm",
};

type Props = HTMLAttributes<HTMLSpanElement> & { variant?: Variant; size?: Size };

export function Badge({ variant = "neutral", size = "sm", className, ...props }: Props) {
  return (
    <span
      className={[shape, variants[variant], sizes[size], className].filter(Boolean).join(" ")}
      {...props}
    />
  );
}

// pillButtonClasses: bottoni toggle (tab attiva/tag filtro) che condividono forma e size con
// Badge ma restano bottoni, non span — la logica di stato attivo resta al chiamante
export function pillButtonClasses(active: boolean) {
  const interactive =
    "transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary";
  return active
    ? [shape, variants.solid, sizes.md, interactive].join(" ")
    : [
        shape,
        "border border-border bg-surface text-muted-foreground hover:border-border-strong hover:bg-surface-secondary hover:text-foreground",
        sizes.md,
        interactive,
      ].join(" ");
}
