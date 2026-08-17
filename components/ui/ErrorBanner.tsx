import type { ReactNode } from "react";

const VARIANT_CLASSES = {
  error: "bg-destructive/10 text-destructive",
  warning: "bg-warning/10 text-warning",
};

export function ErrorBanner({
  children,
  variant = "error",
  className = "",
}: {
  children: ReactNode;
  variant?: keyof typeof VARIANT_CLASSES;
  className?: string;
}) {
  return (
    <div role="alert" className={`rounded-lg px-3 py-2 text-sm ${VARIANT_CLASSES[variant]} ${className}`}>{children}</div>
  );
}
