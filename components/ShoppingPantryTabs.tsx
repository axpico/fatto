"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Tabs } from "@/components/ui/Tabs";
import { ShoppingListEditor } from "@/components/ShoppingListEditor";
import { PantryEditor } from "@/components/PantryEditor";

type Item = { id: string; name: string; quantity: number | null; unit: string | null };
type ShoppingItem = Item & { checked: boolean };

const TABS = [
  { value: "lista", label: "Lista spesa" },
  { value: "dispensa", label: "Dispensa" },
];

export function ShoppingPantryTabs({
  shoppingItems,
  pantryItems,
  generateRange,
}: {
  shoppingItems: ShoppingItem[];
  pantryItems: Item[];
  generateRange: { from: string; to: string } | null;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const tab = searchParams.get("tab") === "dispensa" ? "dispensa" : "lista";

  function setTab(value: string) {
    const params = new URLSearchParams(searchParams);
    params.set("tab", value);
    router.push(`${pathname}?${params}`);
  }

  return (
    <div>
      <div className="mb-4">
        <Tabs tabs={TABS} value={tab} onChange={setTab} aria-label="Lista spesa e dispensa" />
      </div>
      <div role="tabpanel" id="panel-lista" aria-labelledby="tab-lista" hidden={tab !== "lista"}>
        <ShoppingListEditor initialItems={shoppingItems} generateRange={generateRange} />
      </div>
      <div role="tabpanel" id="panel-dispensa" aria-labelledby="tab-dispensa" hidden={tab !== "dispensa"}>
        <PantryEditor initialItems={pantryItems} />
      </div>
    </div>
  );
}
