-- Fuzzy matching per la ricerca "cosa cucino con quello che ho" (solo su Ingredient.name)
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX ingredient_name_trgm_idx ON "Ingredient" USING GIN (name gin_trgm_ops);

-- Trust boundary: il rating va vincolato anche a livello DB, non solo in app
ALTER TABLE "CookLog" ADD CONSTRAINT cooklog_rating_range CHECK (rating IS NULL OR (rating BETWEEN 1 AND 5));
