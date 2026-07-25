import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { prisma } from "@/lib/db";
import { MealPlanCalendar } from "@/components/MealPlanCalendar";
import { buttonClasses } from "@/components/ui/Button";

function toISODate(date: Date) {
  return date.toISOString().slice(0, 10);
}

function mondayOf(isoDate: string | undefined) {
  const base = isoDate ? new Date(`${isoDate}T00:00:00.000Z`) : new Date();
  const day = base.getUTCDay(); // 0 = domenica
  const diff = day === 0 ? -6 : 1 - day;
  const monday = new Date(base);
  monday.setUTCDate(base.getUTCDate() + diff);
  monday.setUTCHours(0, 0, 0, 0);
  return monday;
}

function addDays(date: Date, days: number) {
  const d = new Date(date);
  d.setUTCDate(d.getUTCDate() + days);
  return d;
}

export default async function PlanPage({
  searchParams,
}: {
  searchParams: Promise<{ week?: string }>;
}) {
  const { week } = await searchParams;
  const monday = mondayOf(week);
  const sunday = addDays(monday, 6);
  const weekDates = Array.from({ length: 7 }, (_, i) => toISODate(addDays(monday, i)));

  const [entries, recipes] = await Promise.all([
    prisma.mealPlan.findMany({
      where: { plannedDate: { gte: monday, lte: sunday } },
      include: { recipe: { select: { id: true, title: true } } },
    }),
    prisma.recipe.findMany({ select: { id: true, title: true }, orderBy: { title: "asc" } }),
  ]);

  const prevWeek = toISODate(addDays(monday, -7));
  const nextWeek = toISODate(addDays(monday, 7));

  return (
    <div className="p-4">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-lg font-semibold text-foreground">Piano settimanale</h1>
        <div className="flex gap-2">
          <Link href={`/plan?week=${prevWeek}`} className={buttonClasses("secondary", "sm")}>
            <ChevronLeft className="h-4 w-4" aria-hidden="true" /> Prima
          </Link>
          <Link href={`/plan?week=${nextWeek}`} className={buttonClasses("secondary", "sm")}>
            Dopo <ChevronRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </div>
      </div>

      <MealPlanCalendar
        weekDates={weekDates}
        initialEntries={entries.map((e) => ({
          id: e.id,
          recipeId: e.recipeId,
          plannedDate: toISODate(e.plannedDate),
          mealSlot: e.mealSlot,
          recipe: e.recipe,
        }))}
        recipes={recipes}
      />

      <Link
        href={`/shopping-list?generateFrom=${weekDates[0]}&generateTo=${weekDates[6]}`}
        className={`${buttonClasses("primary", "lg")} mt-4 w-full`}
      >
        Genera lista spesa per questa settimana
      </Link>
    </div>
  );
}
