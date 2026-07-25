import Link from "next/link";
import { Clock, UtensilsCrossed } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";

export type RecipeCardData = {
  id: string;
  title: string;
  photoUrl: string | null;
  prepTimeMinutes: number | null;
  cookTimeMinutes: number | null;
  tags: { id: string; name: string }[];
};

export function RecipeCard({ recipe }: { recipe: RecipeCardData }) {
  const totalTime = (recipe.prepTimeMinutes ?? 0) + (recipe.cookTimeMinutes ?? 0);

  return (
    <Link href={`/recipes/${recipe.id}`} className="block">
      <Card className="flex gap-3 p-3 transition-colors hover:border-primary/40">
        {recipe.photoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={`/api/uploads/${recipe.photoUrl}`}
            alt={recipe.title}
            className="h-16 w-16 shrink-0 rounded-lg object-cover"
          />
        ) : (
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-lg bg-background text-muted-foreground">
            <UtensilsCrossed className="h-6 w-6" aria-hidden="true" />
          </div>
        )}
        <div className="min-w-0 flex-1">
          <h3 className="truncate font-medium text-foreground">{recipe.title}</h3>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            {totalTime > 0 && (
              <span className="inline-flex items-center gap-1">
                <Clock className="h-3.5 w-3.5" aria-hidden="true" /> {totalTime} min
              </span>
            )}
            {recipe.tags.slice(0, 3).map((tag) => (
              <Badge key={tag.id}>{tag.name}</Badge>
            ))}
          </div>
        </div>
      </Card>
    </Link>
  );
}
