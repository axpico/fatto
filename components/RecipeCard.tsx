import Link from "next/link";
import { Clock, UtensilsCrossed } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { TiltCard } from "@/components/motion/TiltCard";

export type RecipeCardData = {
  id: string;
  title: string;
  description?: string | null;
  photoUrl: string | null;
  prepTimeMinutes: number | null;
  cookTimeMinutes: number | null;
  tags: { id: string; name: string }[];
};

export function RecipeCard({
  recipe,
  variant = "list",
}: {
  recipe: RecipeCardData;
  variant?: "list" | "grid" | "featured";
}) {
  const totalTime = (recipe.prepTimeMinutes ?? 0) + (recipe.cookTimeMinutes ?? 0);

  const timeAndTags = (
    <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
      {totalTime > 0 && (
        <span className="inline-flex items-center gap-1">
          <Clock className="h-3.5 w-3.5" aria-hidden="true" /> {totalTime} min
        </span>
      )}
      {recipe.tags.slice(0, 3).map((tag) => (
        <Badge key={tag.id} className="font-script text-[0.95rem]">{tag.name}</Badge>
      ))}
      {recipe.tags.length > 3 && <Badge variant="neutral">+{recipe.tags.length - 3}</Badge>}
    </div>
  );

  if (variant === "featured") {
    return (
      <Link href={`/recipes/${recipe.id}`} className="block rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background">
        <TiltCard>
        <Card className="flex flex-col overflow-hidden transition-[border-color,box-shadow,transform] duration-200 hover:-translate-y-0.5 hover:border-border-strong hover:shadow-md sm:flex-row">
          {recipe.photoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={`/api/uploads/${recipe.photoUrl}`}
              alt={recipe.title}
              className="aspect-[4/3] w-full shrink-0 object-cover sm:aspect-auto sm:w-64"
            />
          ) : (
            <div className="flex aspect-[4/3] w-full shrink-0 items-center justify-center bg-surface-secondary text-muted-foreground sm:aspect-auto sm:w-64">
              <UtensilsCrossed className="h-8 w-8" aria-hidden="true" />
            </div>
          )}
          <div className="flex flex-1 flex-col justify-center gap-1.5 p-4 sm:p-5">
            <h3 className="font-display text-xl font-semibold text-foreground">{recipe.title}</h3>
            {recipe.description && <p className="line-clamp-2 text-sm text-muted-foreground">{recipe.description}</p>}
            {timeAndTags}
          </div>
        </Card>
        </TiltCard>
      </Link>
    );
  }

  if (variant === "grid") {
    return (
      <Link href={`/recipes/${recipe.id}`} className="block h-full rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background">
        <TiltCard className="h-full">
        <Card className="flex h-full flex-col overflow-hidden transition-[border-color,box-shadow,transform] duration-200 hover:-translate-y-0.5 hover:border-border-strong hover:shadow-md">
          {recipe.photoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={`/api/uploads/${recipe.photoUrl}`}
              alt={recipe.title}
              className="aspect-[4/3] w-full shrink-0 object-cover"
            />
          ) : (
            <div className="flex aspect-[4/3] w-full shrink-0 items-center justify-center bg-surface-secondary text-muted-foreground">
              <UtensilsCrossed className="h-8 w-8" aria-hidden="true" />
            </div>
          )}
          <div className="flex flex-1 flex-col p-3.5">
            <h3 className="truncate font-display text-lg font-semibold text-foreground">{recipe.title}</h3>
            <div className="mt-1 flex flex-nowrap items-center gap-2 overflow-hidden text-xs text-muted-foreground">
              {totalTime > 0 && (
                <span className="inline-flex shrink-0 items-center gap-1">
                  <Clock className="h-3.5 w-3.5" aria-hidden="true" /> {totalTime} min
                </span>
              )}
              {recipe.tags.slice(0, 1).map((tag) => (
                <Badge key={tag.id} className="truncate font-script text-[0.95rem]">{tag.name}</Badge>
              ))}
              {recipe.tags.length > 1 && <Badge variant="neutral" className="shrink-0">+{recipe.tags.length - 1}</Badge>}
            </div>
          </div>
        </Card>
        </TiltCard>
      </Link>
    );
  }

  return (
    <Link href={`/recipes/${recipe.id}`} className="block rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background">
      <Card className="flex gap-4 p-3.5 transition-[border-color,box-shadow,transform] duration-200 hover:-translate-y-0.5 hover:border-border-strong hover:shadow-md">
        {recipe.photoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={`/api/uploads/${recipe.photoUrl}`}
            alt={recipe.title}
            className="h-20 w-20 shrink-0 rounded-md object-cover"
          />
        ) : (
          <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-md bg-surface-secondary text-muted-foreground">
            <UtensilsCrossed className="h-6 w-6" aria-hidden="true" />
          </div>
        )}
        <div className="min-w-0 flex-1">
          <h3 className="truncate font-display text-lg font-semibold text-foreground">{recipe.title}</h3>
          {timeAndTags}
        </div>
      </Card>
    </Link>
  );
}
