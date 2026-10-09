import { RecipeForm } from "@/components/RecipeForm";

export default function NewRecipePage() {
  return (
    <div className="page-shell pb-0">
      <h1 className="page-title mb-4">Nuova ricetta</h1>
      <RecipeForm backHref="/" />
    </div>
  );
}
