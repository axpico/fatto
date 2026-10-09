import Link from "next/link";
import { Clock, Star, UtensilsCrossed } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { buttonClasses } from "@/components/ui/Button";
import { TiltCard } from "@/components/motion/TiltCard";
import { UploadedImage } from "@/components/UploadedImage";
import { FavoriteButton } from "@/components/FavoriteButton";
import { formatRelativeDate } from "@/lib/formatDate";

export type RecipeCardData = {
  id: string;
  title: string;
  description?: string | null;
  photoUrl: string | null;
  prepTimeMinutes: number | null;
  cookTimeMinutes: number | null;
  tags: { id: string; name: string }[];
  favorite: boolean;
  timesCooked?: number;
  avgRating?: number | null;
  lastCookedAt?: string | null;
};

function cookStatsParts(recipe: RecipeCardData): string[] {
  if (!recipe.timesCooked) return [];
  const parts = [`cucinata ${recipe.timesCooked} ${recipe.timesCooked === 1 ? "volta" : "volte"}`];
  if (recipe.lastCookedAt) parts.push(`ultima volta ${formatRelativeDate(recipe.lastCookedAt)}`);
  return parts;
}

// Dot-separated list of strings, e.g. "20 min · antipasti · cucinata 3 volte" — used for both the
// time/tags line and the cook-stats line, over a photo (light) or over the background (default).
function DotList({ items, light }: { items: string[]; light?: boolean }) {
  return (
    <>
      {items.map((text) => (
        <span
          key={text}
          className={`before:mr-2 before:content-['\\00b7'] first:before:hidden ${light ? "before:text-white/40" : ""}`}
        >
          {text}
        </span>
      ))}
    </>
  );
}

const overlayFavoriteClasses =
  buttonClasses("overlay", "icon", "absolute right-3 top-3 z-10");

const linkClasses =
  "block rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background";

function metaLine(recipe: RecipeCardData, max = 2) {
  const totalTime = (recipe.prepTimeMinutes ?? 0) + (recipe.cookTimeMinutes ?? 0);
  const parts = recipe.tags.slice(0, max).map((t) => t.name);
  return { totalTime, parts };
}

// Title + meta laid over the photo, readable on any image thanks to the scrim.
export function Overlay({ recipe, big = false }: { recipe: RecipeCardData; big?: boolean }) {
  const { totalTime, parts } = metaLine(recipe, big ? 3 : 1);
  const cookParts = cookStatsParts(recipe);
  return (
    <>
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/25 to-transparent" />
      <div className="absolute inset-x-0 bottom-0 flex flex-col gap-1 p-4 sm:p-5">
        <h3
          className={`font-display font-semibold text-white drop-shadow-sm ${big ? "text-2xl sm:text-3xl" : "line-clamp-2 text-lg"}`}
        >
          {recipe.title}
        </h3>
        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-white/80">
          {totalTime > 0 && (
            <span className="inline-flex items-center gap-1">
              <Clock className="h-3.5 w-3.5" aria-hidden="true" /> {totalTime} min
            </span>
          )}
          <DotList items={parts} light />
        </div>
        {cookParts.length > 0 && (
          <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-white/80">
            {recipe.avgRating != null && (
              <span className="inline-flex items-center gap-1">
                <Star className="h-3.5 w-3.5" fill="currentColor" aria-hidden="true" /> {recipe.avgRating.toFixed(1)}
              </span>
            )}
            <DotList items={cookParts} light />
          </div>
        )}
      </div>
    </>
  );
}

export function NoPhoto({ recipe, tall, big = false }: { recipe: RecipeCardData; tall?: boolean; big?: boolean }) {
  const { totalTime, parts } = metaLine(recipe, big ? 3 : 1);
  const cookParts = cookStatsParts(recipe);
  return (
    <div className={`flex ${tall ? "flex-col" : ""} h-full w-full items-center justify-center gap-3 bg-surface-secondary p-4 text-center`}>
      <UtensilsCrossed className="h-7 w-7 shrink-0 text-muted-foreground" aria-hidden="true" />
      <div>
        <h3 className={`font-display font-semibold text-foreground ${big ? "text-2xl sm:text-3xl" : "text-lg"}`}>{recipe.title}</h3>
        {(totalTime > 0 || parts.length > 0) && (
          <div className="mt-1 flex flex-wrap items-center justify-center gap-x-2 gap-y-0.5 text-xs text-muted-foreground">
            {totalTime > 0 && (
              <span className="inline-flex items-center gap-1">
                <Clock className="h-3.5 w-3.5" aria-hidden="true" /> {totalTime} min
              </span>
            )}
            <DotList items={parts} />
          </div>
        )}
        {cookParts.length > 0 && (
          <div className="mt-1 flex flex-wrap items-center justify-center gap-x-2 gap-y-0.5 text-xs text-muted-foreground">
            {recipe.avgRating != null && (
              <span className="inline-flex items-center gap-1">
                <Star className="h-3.5 w-3.5" fill="currentColor" aria-hidden="true" /> {recipe.avgRating.toFixed(1)}
              </span>
            )}
            <DotList items={cookParts} />
          </div>
        )}
      </div>
    </div>
  );
}

export function RecipeCard({
  recipe,
  variant = "list",
}: {
  recipe: RecipeCardData;
  variant?: "list" | "grid" | "featured";
}) {
  if (variant === "featured") {
    return (
      <Link href={`/recipes/${recipe.id}`} className={linkClasses}>
        <TiltCard>
          <Card className="relative aspect-[2/1] overflow-hidden transition-[box-shadow,transform] duration-200 hover:scale-[1.01] hover:shadow-md sm:aspect-[21/9]">
            {recipe.photoUrl ? (
              <>
                <UploadedImage filename={recipe.photoUrl} alt={recipe.title} className="absolute inset-0 h-full w-full object-cover" />
                <Overlay recipe={recipe} big />
              </>
            ) : (
              <NoPhoto recipe={recipe} tall big />
            )}
            <FavoriteButton recipeId={recipe.id} initialFavorite={recipe.favorite} className={overlayFavoriteClasses} />
          </Card>
        </TiltCard>
      </Link>
    );
  }

  if (variant === "grid") {
    return (
      <Link href={`/recipes/${recipe.id}`} className={`${linkClasses} h-full`}>
        <TiltCard className="h-full">
          <Card className="relative aspect-[4/5] h-full overflow-hidden transition-[box-shadow,transform] duration-200 hover:scale-[1.01] hover:shadow-md">
            {recipe.photoUrl ? (
              <>
                <UploadedImage filename={recipe.photoUrl} alt={recipe.title} className="absolute inset-0 h-full w-full object-cover" />
                <Overlay recipe={recipe} />
              </>
            ) : (
              <NoPhoto recipe={recipe} tall />
            )}
            <FavoriteButton recipeId={recipe.id} initialFavorite={recipe.favorite} className={overlayFavoriteClasses} />
          </Card>
        </TiltCard>
      </Link>
    );
  }

  // list — compact row
  const { totalTime, parts } = metaLine(recipe);
  const cookParts = cookStatsParts(recipe);
  return (
    <Link href={`/recipes/${recipe.id}`} className={linkClasses}>
      <Card className="flex gap-4 overflow-hidden p-3 transition-[border-color,box-shadow,transform] duration-200 hover:scale-[1.01] hover:border-border-strong hover:shadow-md">
        {recipe.photoUrl ? (
          <UploadedImage filename={recipe.photoUrl} alt={recipe.title} className="h-20 w-20 shrink-0 rounded-lg object-cover" />
        ) : (
          <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-lg bg-surface-secondary text-muted-foreground">
            <UtensilsCrossed className="h-6 w-6" aria-hidden="true" />
          </div>
        )}
        <div className="min-w-0 flex-1 self-center">
          <h3 className="truncate font-display text-lg font-semibold text-foreground">{recipe.title}</h3>
          <div className="mt-1 flex flex-wrap items-center gap-x-2 text-xs text-muted-foreground">
            {totalTime > 0 && (
              <span className="inline-flex items-center gap-1">
                <Clock className="h-3.5 w-3.5" aria-hidden="true" /> {totalTime} min
              </span>
            )}
            <DotList items={parts} />
          </div>
          {cookParts.length > 0 && (
            <div className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-muted-foreground">
              {recipe.avgRating != null && (
                <span className="inline-flex items-center gap-1">
                  <Star className="h-3.5 w-3.5" fill="currentColor" aria-hidden="true" /> {recipe.avgRating.toFixed(1)}
                </span>
              )}
              <DotList items={cookParts} />
            </div>
          )}
        </div>
        <FavoriteButton recipeId={recipe.id} initialFavorite={recipe.favorite} className="flex h-10 w-10 shrink-0 items-center justify-center self-center rounded-full text-muted-foreground transition-colors hover:bg-surface-secondary hover:text-foreground" />
      </Card>
    </Link>
  );
}
