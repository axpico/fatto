import { z } from "zod";
import { requireApiUser } from "@/lib/auth";
import { htmlToText } from "@/lib/ai/htmlToText";
import { extractRecipe, AiExtractionError } from "@/lib/ai/extractRecipe";
import { extractJsonLdRecipe } from "@/lib/ai/jsonLd";
import { saveUpload } from "@/lib/uploads";

const bodySchema = z.object({ url: z.string().url() });

const MAX_IMAGE_BYTES = 8 * 1024 * 1024;

// ponytail: la foto di copertina è un bonus best-effort, qualsiasi fallimento qui viene ignorato
// silenziosamente — non deve mai far fallire l'intero import
async function fetchCoverImage(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
    if (!res.ok) return null;
    const contentType = res.headers.get("content-type") ?? "";
    if (!contentType.startsWith("image/")) return null;
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.byteLength > MAX_IMAGE_BYTES) return null;
    const file = new File([buf], "cover.jpg", { type: contentType });
    return await saveUpload(file);
  } catch {
    return null;
  }
}

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

  const jsonLd = extractJsonLdRecipe(html);

  try {
    const { recipe, provider } = await extractRecipe(htmlToText(html));
    const photoUrl = jsonLd?.imageUrl ? await fetchCoverImage(jsonLd.imageUrl) : null;
    return Response.json({
      ...recipe,
      nutrition: jsonLd?.nutrition ?? recipe.nutrition,
      photoUrl,
      provider,
    });
  } catch (err) {
    if (err instanceof AiExtractionError) {
      return Response.json({ error: err.message }, { status: 422 });
    }
    return Response.json({ error: "Estrazione AI non riuscita" }, { status: 422 });
  }
}
