"use client";

import Link from "next/link";
import { ChefHat } from "lucide-react";
import { buttonClasses } from "@/components/ui/Button";
import { useSavedCookStep } from "@/lib/useCookSession";

export function CookButton({ recipeId }: { recipeId: string }) {
  const savedStep = useSavedCookStep(recipeId);
  return (
    <Link href={`/recipes/${recipeId}/cook`} className={buttonClasses("primary", "md")}>
      <ChefHat className="h-4 w-4" aria-hidden="true" />
      {savedStep !== null && savedStep > 0 ? `Riprendi (passaggio ${savedStep + 1})` : "Cucina"}
    </Link>
  );
}
