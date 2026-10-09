import { Skeleton } from "@/components/ui/Skeleton";

// shaped like the home page (header, search, featured card, list rows): most loads land there
export default function Loading() {
  return (
    <div className="page-shell max-w-3xl space-y-6" aria-busy="true" aria-label="Caricamento">
      <Skeleton className="h-32 rounded-xl" />
      <Skeleton className="h-10 rounded-md" />
      <Skeleton className="aspect-[2/1] rounded-xl sm:aspect-[21/9]" />
      <div className="space-y-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-[88px] rounded-xl" />
        ))}
      </div>
    </div>
  );
}
