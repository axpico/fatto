import type { ReactNode } from "react";

export function ErrorBanner({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <p role="alert" className={`rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive ${className}`}>{children}</p>
  );
}
