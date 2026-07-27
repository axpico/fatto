import type { HTMLAttributes } from "react";

export function Skeleton({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={["animate-pulse rounded-md bg-surface-secondary", className].filter(Boolean).join(" ")} {...props} />
  );
}
