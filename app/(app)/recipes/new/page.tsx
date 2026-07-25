import { RecipeForm } from "@/components/RecipeForm";

export default function NewRecipePage() {
  return (
    <div>
      <h1 className="px-4 pt-4 text-lg font-semibold text-foreground">Nuova ricetta</h1>
      <RecipeForm />
    </div>
  );
}
