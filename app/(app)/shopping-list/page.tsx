import Link from "next/link";
import { prisma } from "@/lib/db";
import { ShoppingListEditor } from "@/components/ShoppingListEditor";
import { pillButtonClasses } from "@/components/ui/Badge";

export default async function ShoppingListPage({
  searchParams,
}: {
  searchParams: Promise<{ generateFrom?: string; generateTo?: string }>;
}) {
  const { generateFrom, generateTo } = await searchParams;
  const items = await prisma.shoppingListItem.findMany({
    orderBy: [{ checked: "asc" }, { createdAt: "asc" }],
  });

  return (
    <div className="p-4">
      <h1 className="mb-4 text-lg font-semibold text-foreground">Lista della spesa</h1>
      <div className="mb-4 flex gap-2">
        <span className={pillButtonClasses(true)}>Lista spesa</span>
        <Link href="/pantry" className={pillButtonClasses(false)}>
          Dispensa
        </Link>
      </div>
      <ShoppingListEditor
        initialItems={items}
        generateRange={generateFrom && generateTo ? { from: generateFrom, to: generateTo } : null}
      />
    </div>
  );
}
