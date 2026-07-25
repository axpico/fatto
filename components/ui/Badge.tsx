import type { HTMLAttributes } from "react";

type Variant = "neutral" | "accent";
type Size = "sm" | "md";

const variants: Record<Variant, string> = {
  neutral: "bg-background text-muted-foreground border border-border",
  accent: "bg-primary/10 text-primary",
};

const sizes: Record<Size, string> = {
  sm: "px-2 py-0.5 text-xs",
  md: "px-3 py-1 text-sm",
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
    ? "rounded-full bg-primary px-3 py-1 text-sm text-white"
    : "rounded-full border border-border bg-surface px-3 py-1 text-sm text-muted-foreground hover:border-primary hover:text-primary";
}
