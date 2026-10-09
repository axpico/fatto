import { SwipeDeck, type DeckFilters } from "@/components/SwipeDeck";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function first(value: string | string[] | undefined): string {
  return (Array.isArray(value) ? value[0] : value) ?? "";
}

function list(value: string | string[] | undefined): string[] {
  return first(value).split(",").map((v) => v.trim()).filter(Boolean);
}

function numeric(value: string | string[] | undefined): string {
  const v = first(value);
  return /^\d+$/.test(v) ? v : "";
}

// filters live in the URL (see deckFiltersToParams): back from a recipe deals the same deck again
export default async function DecidiPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const filters: DeckFilters = {
    tagIds: list(params.tags),
    tagMode: first(params.tagMode) === "any" ? "any" : "all",
    ingredients: list(params.ingredients),
    prepMax: numeric(params.prepMax),
    cookMax: numeric(params.cookMax),
  };
  return <SwipeDeck initialFilters={filters} />;
}
