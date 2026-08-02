import Link from "next/link";
import { Clock, UtensilsCrossed } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { TiltCard } from "@/components/motion/TiltCard";
import { UploadedImage } from "@/components/UploadedImage";

export type RecipeCardData = {
  id: string;
  title: string;
  description?: string | null;
  photoUrl: string | null;
  prepTimeMinutes: number | null;
  cookTimeMinutes: number | null;
  tags: { id: string; name: string }[];
};

const linkClasses =
  "block rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background";

function metaLine(recipe: RecipeCardData, max = 2) {
  const totalTime = (recipe.prepTimeMinutes ?? 0) + (recipe.cookTimeMinutes ?? 0);
  const parts = recipe.tags.slice(0, max).map((t) => t.name);
  return { totalTime, parts };
}

// Title + meta laid over the photo, readable on any image thanks to the scrim.
function Overlay({ recipe, big = false }: { recipe: RecipeCardData; big?: boolean }) {
  const { totalTime, parts } = metaLine(recipe, big ? 3 : 1);
  return (
    <>
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/25 to-transparent" />
      <div className="absolute inset-x-0 bottom-0 flex flex-col gap-1 p-4 sm:p-5">
        <h3
          className={`font-display font-semibold text-white drop-shadow-sm ${big ? "text-2xl sm:text-3xl" : "truncate text-lg"}`}
        >
          {recipe.title}
        </h3>
        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-white/80">
          {totalTime > 0 && (
            <span className="inline-flex items-center gap-1">
              <Clock className="h-3.5 w-3.5" aria-hidden="true" /> {totalTime} min
            </span>
          )}
          {parts.map((name) => (
            <span key={name} className="before:mr-2 before:text-white/40 before:content-['\00b7'] first:before:hidden">
              {name}
            </span>
          ))}
        </div>
      </div>
    </>
  );
}

function NoPhoto({ title, tall }: { title: string; tall?: boolean }) {
  return (
    <div className={`flex ${tall ? "flex-col" : ""} h-full w-full items-center justify-center gap-3 bg-surface-secondary p-4 text-center`}>
      <UtensilsCrossed className="h-7 w-7 shrink-0 text-muted-foreground" aria-hidden="true" />
      <h3 className="font-display text-lg font-semibold text-foreground">{title}</h3>
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
          <Card className="relative aspect-[16/9] overflow-hidden transition-[box-shadow,transform] duration-200 hover:scale-[1.01] hover:shadow-md sm:aspect-[21/9]">
            {recipe.photoUrl ? (
              <>
                <UploadedImage filename={recipe.photoUrl} alt={recipe.title} className="absolute inset-0 h-full w-full object-cover" />
                <Overlay recipe={recipe} big />
              </>
            ) : (
              <NoPhoto title={recipe.title} tall />
            )}
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
              <NoPhoto title={recipe.title} tall />
            )}
          </Card>
        </TiltCard>
      </Link>
    );
  }

  // list — compact row
  const { totalTime, parts } = metaLine(recipe);
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
            {parts.map((name) => (
              <span key={name} className="before:mr-2 before:content-['\00b7'] first:before:hidden">
                {name}
              </span>
            ))}
          </div>
        </div>
      </Card>
    </Link>
  );
}
