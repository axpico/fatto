import { forwardRef, type ButtonHTMLAttributes } from "react";

type Variant = "primary" | "secondary" | "destructive" | "ghost";
type Size = "sm" | "md" | "lg";

const base =
  "inline-flex min-h-10 items-center justify-center gap-1.5 rounded-md font-medium transition-[background-color,border-color,color,box-shadow,transform] duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50";

const variants: Record<Variant, string> = {
  primary: "bg-primary text-primary-foreground shadow-sm hover:bg-primary-hover hover:shadow-md",
  secondary:
    "border border-border bg-surface text-foreground shadow-sm hover:border-border-strong hover:bg-surface-secondary",
  destructive: "border border-destructive/30 bg-surface text-destructive hover:bg-destructive/10",
  ghost: "text-muted-foreground hover:bg-surface-secondary hover:text-foreground",
};

const sizes: Record<Size, string> = {
  sm: "min-h-9 px-3 text-sm",
  md: "px-4 text-sm",
  lg: "min-h-12 px-5 text-base",
};

export function buttonClasses(variant: Variant = "primary", size: Size = "md", className = "") {
  return [base, variants[variant], sizes[size], className].filter(Boolean).join(" ");
}

type Props = ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: Size };

export const Button = forwardRef<HTMLButtonElement, Props>(
  ({ variant = "primary", size = "md", className, ...props }, ref) => (
    <button ref={ref} className={buttonClasses(variant, size, className)} {...props} />
  ),
);
Button.displayName = "Button";
