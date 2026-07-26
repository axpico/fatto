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
    <div className="page-shell">
      <div className="page-header">
        <div>
          <h1 className="page-title">Spesa e dispensa</h1>
          <p className="page-description">Organizza cosa comprare e ciò che hai già a casa.</p>
        </div>
      </div>
      <ShoppingPantryTabs
        shoppingItems={shoppingItems}
        pantryItems={pantryItems}
        generateRange={generateFrom && generateTo ? { from: generateFrom, to: generateTo } : null}
      />
    </div>
  );
}
