import { prisma } from "@/lib/db";
import { ShoppingPantryTabs } from "@/components/ShoppingPantryTabs";

export default async function ShoppingListPage({
  searchParams,
}: {
  searchParams: Promise<{ generateFrom?: string; generateTo?: string }>;
}) {
  const { generateFrom, generateTo } = await searchParams;
  const [shoppingItems, pantryItems] = await Promise.all([
    prisma.shoppingListItem.findMany({ orderBy: [{ checked: "asc" }, { createdAt: "asc" }] }),
    prisma.pantryItem.findMany({ orderBy: { name: "asc" } }),
  ]);

  return (
    <div className="p-4">
      <h1 className="mb-4 font-display text-lg font-semibold text-foreground">Spesa e dispensa</h1>
      <ShoppingPantryTabs
        shoppingItems={shoppingItems}
        pantryItems={pantryItems}
        generateRange={generateFrom && generateTo ? { from: generateFrom, to: generateTo } : null}
      />
    </div>
  );
}
