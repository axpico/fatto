import { z } from "zod";
import { requireApiUser } from "@/lib/auth";
import { htmlToText } from "@/lib/ai/htmlToText";
import { extractRecipe, AiExtractionError } from "@/lib/ai/extractRecipe";
import { extractJsonLdRecipe } from "@/lib/ai/jsonLd";
import { saveUploadFromUrl } from "@/lib/uploads";

const bodySchema = z.object({ url: z.string().url() });

// Risposta NDJSON in streaming, stesso pattern di app/api/import/reel/route.ts: una riga
// { stage } per avanzamento, poi una riga finale { done: true, ...ricetta } o { done: true, error }.
export async function POST(request: Request) {
  const { unauthorized } = await requireApiUser();
  if (unauthorized) return unauthorized;

  const body = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success || !/^https?:\/\//i.test(parsed.data.url)) {
    return Response.json({ error: "Link non valido" }, { status: 400 });
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      function write(line: object) {
        controller.enqueue(encoder.encode(JSON.stringify(line) + "\n"));
      }
      try {
        write({ stage: "Scaricando pagina..." });
        let html: string;
        try {
          const res = await fetch(parsed.data.url, { signal: AbortSignal.timeout(10000) });
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          html = await res.text();
        } catch {
          write({ done: true, error: "Impossibile scaricare la pagina. Controlla il link e riprova." });
          return;
        }

        const jsonLd = extractJsonLdRecipe(html);

        write({ stage: "Estraendo ricetta..." });
        const { recipe, provider } = await extractRecipe(htmlToText(html));
        const photoUrl = jsonLd?.imageUrl ? await saveUploadFromUrl(jsonLd.imageUrl) : null;
        const stepImageFilenames = jsonLd?.stepImageUrls
          ? await Promise.all(
              jsonLd.stepImageUrls.map((url) => (url ? saveUploadFromUrl(url) : Promise.resolve(null))),
            )
          : null;
        write({
          done: true,
          ...recipe,
          nutrition: jsonLd?.nutrition ?? recipe.nutrition,
          steps: recipe.steps.map((step, i) => ({
            ...step,
            image_filename: stepImageFilenames?.[i] ?? null,
          })),
          photoUrl,
          provider,
        });
      } catch (err) {
        if (err instanceof AiExtractionError) {
          write({ done: true, error: err.message });
        } else {
          write({ done: true, error: "Estrazione AI non riuscita" });
        }
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: { "Content-Type": "application/x-ndjson" },
  });
}
