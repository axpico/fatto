import { Star } from "lucide-react";

export function StarRating({
  value,
  onChange,
}: {
  value: number | null;
  onChange: (rating: number) => void;
}) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          onClick={() => onChange(n)}
          aria-label={`${n} stelle`}
          className={n <= (value ?? 0) ? "text-amber-500" : "text-muted-foreground"}
        >
          <Star className="h-4 w-4" fill={n <= (value ?? 0) ? "currentColor" : "none"} aria-hidden="true" />
        </button>
      ))}
    </div>
  );
}
