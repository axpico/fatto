-- ingredient_name_trgm_idx was dropped in 20260725211821_pantry_and_ingredient_catalog and never
-- recreated, but findIngredientMatches still runs similarity() against Ingredient.name
CREATE INDEX ingredient_name_trgm_idx ON "Ingredient" USING GIN (name gin_trgm_ops);

-- Tag.name gets similarity() queries too (tag dedupe, /api/tags/duplicates) but never had an index
CREATE INDEX tag_name_trgm_idx ON "Tag" USING GIN (name gin_trgm_ops);
