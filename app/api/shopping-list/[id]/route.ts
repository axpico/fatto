import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireApiUser } from "@/lib/auth";
import { aggregateIngredients } from "@/lib/shoppingList";

type Params = { params: Promise<{ id: string }> };

const patchSchema = z.object({
  checked: z.boolean().optional(),
  name: z.string().trim().min(1).optional(),
  quantity: z.number().positive().nullable().optional(),
  unit: z.string().trim().min(1).nullable().optional(),
});

// ponytail: spuntare un articolo lo aggiunge alla dispensa, riusando la stessa logica
// di merge unit-aware della lista della spesa invece di scriverne una seconda
async function addToPantry(row: { name: string; quantity: number | null; unit: string | null }) {
  const existing = await prisma.pantryItem.findFirst({
    where: { name: { equals: row.name, mode: "insensitive" } },
  });

  if (!existing) {
    await prisma.pantryItem.create({ data: row });
    return;
  }

  const [merged, ...extra] = aggregateIngredients([
    { name: existing.name, quantity: existing.quantity, unit: existing.unit },
    row,
  ]);

  await prisma.pantryItem.update({
    where: { id: existing.id },
    data: { quantity: merged.quantity, unit: merged.unit },
  });

  for (const e of extra) {
    await prisma.pantryItem.create({ data: e });
  }
}

export async function PATCH(request: Request, { params }: Params) {
  const { unauthorized } = await requireApiUser();
  if (unauthorized) return unauthorized;

  const { id } = await params;
  const body = await request.json().catch(() => null);
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: "Dati non validi" }, { status: 400 });
  }

  const existing = await prisma.shoppingListItem.findUnique({ where: { id } });
  const item = await prisma.shoppingListItem.update({ where: { id }, data: parsed.data });

  if (parsed.data.checked === true && existing && !existing.checked) {
    await addToPantry({ name: item.name, quantity: item.quantity, unit: item.unit });
  }

  return Response.json(item);
}

export async function DELETE(_request: Request, { params }: Params) {
  const { unauthorized } = await requireApiUser();
  if (unauthorized) return unauthorized;

  const { id } = await params;
  await prisma.shoppingListItem.delete({ where: { id } });
  return Response.json({ ok: true });
}
