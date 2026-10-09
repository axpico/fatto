import { prisma } from "@/lib/db";

export type DuplicatePair = { aId: string; aName: string; bId: string; bName: string; sim: number };

const CREATE_TIME_THRESHOLD = 0.6; // conservativo: un falso positivo qui fonde in silenzio due tag distinti

export function pickBestMatch(candidates: { name: string; sim: number }[], threshold: number): string | null {
  const best = candidates[0];
  return best && best.sim >= threshold ? best.name : null;
}

// Riusa un tag esistente molto vicino invece di crearne uno quasi-duplicato ("primi piatti" vs
// "primo piatto"). Coppie corte come "dolce"/"dolci" hanno similarità 0.5, sotto la soglia di
// creazione apposta: quelle le propone la pagina admin "Tag simili", dove si conferma a mano.
export async function resolveTagNames(names: string[]): Promise<string[]> {
  const resolved = await Promise.all(
    names.map(async (name) => {
      const normalized = name.trim().toLowerCase();
      const candidates = await prisma.$queryRaw<{ name: string; sim: number }[]>`
        SELECT name, similarity(name, ${normalized}) AS sim FROM "Tag"
        WHERE similarity(name, ${normalized}) > 0.2
        ORDER BY sim DESC LIMIT 1
      `;
      return pickBestMatch(candidates, CREATE_TIME_THRESHOLD) ?? normalized;
    }),
  );
  return [...new Set(resolved)];
}
