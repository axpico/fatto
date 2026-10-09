import { Star } from "lucide-react";

export function StarRating({
  value,
  onChange,
}: {
  value: number | null;
  onChange: (rating: number) => void;
}) {
  return (
    <div className="-mx-2 flex">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          onClick={() => onChange(n)}
          aria-label={`${n} stelle`}
          aria-pressed={n === value}
          className={`flex h-10 w-10 items-center justify-center rounded-full transition-[color,transform] duration-150 hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary active:scale-95 ${
            n <= (value ?? 0) ? "text-primary" : "text-muted-foreground"
          }`}
        >
          <Star className="h-5 w-5" fill={n <= (value ?? 0) ? "currentColor" : "none"} aria-hidden="true" />
        </button>
      ))}
    </div>
  );
}
