import { z } from "zod";
import { requireApiUser } from "@/lib/auth";
import { extractRecipe } from "@/lib/ai/extractRecipe";
import { AiTaskError } from "@/lib/ai/runAiTask";
import { streamNdjson, writeExtractionError } from "@/lib/ndjson";
import { checkImportRateLimit } from "@/lib/rateLimit";

const bodySchema = z.object({ text: z.string().min(1).max(20000) });

// Risposta NDJSON in streaming, stesso pattern di app/api/import/link/route.ts: una riga
// { stage } per avanzamento, poi una riga finale { done: true, ...ricetta } o { done: true, error }.
export async function POST(request: Request) {
  const { user, unauthorized } = await requireApiUser();
  if (unauthorized) return unauthorized;

  const rateLimited = checkImportRateLimit(user.id);
  if (rateLimited) return rateLimited;

  const body = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: "Testo non valido" }, { status: 400 });
  }

  return streamNdjson(request.signal, async (write) => {
    try {
      write({ stage: "Estraendo ricetta..." });
      const { recipe, provider } = await extractRecipe(parsed.data.text);
      write({ done: true, ...recipe, photoUrl: null, provider });
    } catch (err) {
      writeExtractionError(write, err, AiTaskError);
    }
  });
}
