-- Full-text search italiano su title+description, stesso pattern di pg_trgm: colonna generata + GIN
ALTER TABLE "Recipe" ADD COLUMN search_vector tsvector
  GENERATED ALWAYS AS (
    setweight(to_tsvector('italian', coalesce(title, '')), 'A') ||
    setweight(to_tsvector('italian', coalesce(description, '')), 'B')
  ) STORED;
CREATE INDEX recipe_search_vector_idx ON "Recipe" USING GIN (search_vector);
