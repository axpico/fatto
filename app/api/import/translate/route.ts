import { z } from "zod";
import { requireApiUser } from "@/lib/auth";
import { translateRecipe } from "@/lib/ai/translateRecipe";
import { AiTaskError } from "@/lib/ai/runAiTask";
import { checkImportRateLimit } from "@/lib/rateLimit";

// Solo i campi testuali: il client unisce la traduzione al resto della ricetta, che non passa di qui
// bounded here (not in translationSchema, which also validates the AI's output): this text goes
// straight into the prompt
const text = z.string().max(5000);
const list = z.array(z.string().max(5000)).max(200);
const bodySchema = z.object({
  title: z.string().max(200),
  description: text.nullable(),
  ingredientNames: list,
  stepInstructions: list,
  equipment: list,
  tags: list,
  targetLanguage: z.enum(["italiano", "inglese", "spagnolo", "francese", "tedesco"]),
});

export async function POST(request: Request) {
  const { user, unauthorized } = await requireApiUser();
  if (unauthorized) return unauthorized;

  const rateLimited = checkImportRateLimit(user.id);
  if (rateLimited) return rateLimited;

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return Response.json({ error: "Dati non validi" }, { status: 400 });
  }
  const { targetLanguage, ...input } = parsed.data;

  try {
    const { result, provider } = await translateRecipe(input, targetLanguage);
    return Response.json({ ...result, provider });
  } catch (err) {
    if (err instanceof AiTaskError) {
      return Response.json({ error: err.message }, { status: 422 });
    }
    throw err;
  }
}
