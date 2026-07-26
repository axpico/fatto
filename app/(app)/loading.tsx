export default function Loading() {
  return (
    <div className="page-shell space-y-3">
      <div className="h-9 w-48 animate-pulse rounded-md bg-surface-secondary" />
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="h-24 animate-pulse rounded-xl border border-border bg-surface" />
      ))}
    </div>
  );
}
