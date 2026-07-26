import type { HTMLAttributes } from "react";

type Variant = "neutral" | "accent";
type Size = "sm" | "md";

const variants: Record<Variant, string> = {
  neutral: "border border-border bg-surface-secondary text-muted-foreground",
  accent: "bg-accent text-primary",
};

const sizes: Record<Size, string> = {
  sm: "px-2 py-1 text-xs",
  md: "px-3 py-1.5 text-sm",
};

type Props = HTMLAttributes<HTMLSpanElement> & { variant?: Variant; size?: Size };

export function Badge({ variant = "neutral", size = "sm", className, ...props }: Props) {
  return (
    <span
      className={[
        "inline-flex items-center gap-1 rounded-full font-medium",
        variants[variant],
        sizes[size],
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      {...props}
    />
  );
}

// pillButtonClasses: stessa famiglia visiva di Badge ma per bottoni toggle (tab attiva/tag filtro),
// non un componente separato perché la logica di stato attivo resta al chiamante
export function pillButtonClasses(active: boolean) {
  return active
    ? "rounded-full bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground shadow-sm"
    : "rounded-full border border-border bg-surface px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:border-border-strong hover:bg-surface-secondary hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary";
}
