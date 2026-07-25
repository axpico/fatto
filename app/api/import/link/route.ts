import { z } from "zod";
import { requireApiUser } from "@/lib/auth";
import { htmlToText } from "@/lib/ai/htmlToText";
import { extractRecipe, AiExtractionError } from "@/lib/ai/extractRecipe";

const bodySchema = z.object({ url: z.string().url() });

export async function POST(request: Request) {
  const { unauthorized } = await requireApiUser();
  if (unauthorized) return unauthorized;

  const body = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success || !/^https?:\/\//i.test(parsed.data.url)) {
    return Response.json({ error: "Link non valido" }, { status: 400 });
  }

  let html: string;
  try {
    const res = await fetch(parsed.data.url, { signal: AbortSignal.timeout(10000) });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    html = await res.text();
  } catch {
    return Response.json(
      { error: "Impossibile scaricare la pagina. Controlla il link e riprova." },
      { status: 422 },
    );
  }

  try {
    const recipe = await extractRecipe(htmlToText(html));
    return Response.json(recipe);
  } catch (err) {
    if (err instanceof AiExtractionError) {
      return Response.json({ error: err.message }, { status: 422 });
    }
    return Response.json({ error: "Estrazione AI non riuscita" }, { status: 422 });
  }
}
