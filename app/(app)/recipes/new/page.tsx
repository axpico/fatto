import { RecipeForm } from "@/components/RecipeForm";

export default function NewRecipePage() {
  return (
    <div className="page-shell pb-0">
      <div className="page-header mb-2">
        <div>
          <h1 className="page-title">Nuova ricetta</h1>
          <p className="page-description">Aggiungi i dettagli essenziali, poi completa il resto quando vuoi.</p>
        </div>
      </div>
      <RecipeForm backHref="/" />
    </div>
  );
}
