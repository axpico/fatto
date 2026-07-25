import Link from "next/link";
import { prisma } from "@/lib/db";
import { PantryEditor } from "@/components/PantryEditor";
import { pillButtonClasses } from "@/components/ui/Badge";

export default async function PantryPage() {
  const items = await prisma.pantryItem.findMany({ orderBy: { name: "asc" } });

  return (
    <div className="p-4">
      <h1 className="mb-4 text-lg font-semibold text-foreground">Dispensa</h1>
      <div className="mb-4 flex gap-2">
        <Link href="/shopping-list" className={pillButtonClasses(false)}>
          Lista spesa
        </Link>
        <span className={pillButtonClasses(true)}>Dispensa</span>
      </div>
      <PantryEditor initialItems={items} />
    </div>
  );
}
