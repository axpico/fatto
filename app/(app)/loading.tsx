export default function Loading() {
  return (
    <div className="space-y-3 p-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="h-20 animate-pulse rounded-xl border border-border bg-surface" />
      ))}
    </div>
  );
}
