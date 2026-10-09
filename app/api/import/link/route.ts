import { z } from "zod";
import { requireApiUser } from "@/lib/auth";
import { htmlToText } from "@/lib/ai/htmlToText";
import { extractRecipe } from "@/lib/ai/extractRecipe";
import { AiTaskError } from "@/lib/ai/runAiTask";
import { extractJsonLdRecipe } from "@/lib/ai/jsonLd";
import { resolveStepImages } from "@/lib/ai/schema";
import { fetchImageBuffer, saveUploadFromBuffer } from "@/lib/uploads";
import { MAX_VISION_IMAGES, type VisionImage } from "@/lib/ai/visionImage";
import { streamNdjson, writeExtractionError } from "@/lib/ndjson";
import { fetchPublic } from "@/lib/urlSafety";
import { checkImportRateLimit } from "@/lib/rateLimit";

const bodySchema = z.object({ url: z.string().url().max(2000) });

const VISION_MIME_TYPES = new Set<VisionImage["mediaType"]>([
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
]);

// Risposta NDJSON in streaming, stesso pattern di app/api/import/video/route.ts: una riga
// { stage } per avanzamento, poi una riga finale { done: true, ...ricetta } o { done: true, error }.
export async function POST(request: Request) {
  const { user, unauthorized } = await requireApiUser();
  if (unauthorized) return unauthorized;

  const rateLimited = checkImportRateLimit(user.id);
  if (rateLimited) return rateLimited;

  const body = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success || !/^https?:\/\//i.test(parsed.data.url)) {
    return Response.json({ error: "Link non valido" }, { status: 400 });
  }

  return streamNdjson(request.signal, async (write, signal) => {
    try {
      write({ stage: "Scaricando pagina..." });
      let html: string;
      try {
        const res = await fetchPublic(parsed.data.url, { signal: AbortSignal.any([signal, AbortSignal.timeout(10000)]) });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        html = await res.text();
      } catch (err) {
        console.error("import/link: fetch pagina fallito", parsed.data.url, err);
        write({ done: true, error: "Impossibile scaricare la pagina. Controlla il link e riprova." });
        return;
      }

      const jsonLd = extractJsonLdRecipe(html, parsed.data.url);

      const coverFetched = jsonLd?.imageUrl ? await fetchImageBuffer(jsonLd.imageUrl) : null;
      const stepFetched = jsonLd?.stepImageUrls
        ? await Promise.all(
            jsonLd.stepImageUrls.map((url) => (url ? fetchImageBuffer(url) : Promise.resolve(null))),
          )
        : [];

      // Stessa origine e ordine delle immagini passate al modello: image_index nei passaggi
      // estratti fa riferimento a posizioni in questo array, non nell'ordine dei passaggi JSON-LD
      const visionSources = [coverFetched, ...stepFetched]
        .filter((f): f is { buffer: Buffer; contentType: string } => f != null)
        .filter((f) => VISION_MIME_TYPES.has(f.contentType as VisionImage["mediaType"]))
        .slice(0, MAX_VISION_IMAGES);
      const visionImages: VisionImage[] = visionSources.map((f) => ({
        data: f.buffer,
        mediaType: f.contentType as VisionImage["mediaType"],
      }));

      write({ stage: "Estraendo ricetta..." });
      const { recipe, provider } = await extractRecipe(htmlToText(html), visionImages);
      const photoUrl = coverFetched ? await saveUploadFromBuffer(coverFetched.buffer, coverFetched.contentType) : null;
      const visionFilenames = await Promise.all(
        visionSources.map((f) => (f === coverFetched ? photoUrl : saveUploadFromBuffer(f.buffer, f.contentType))),
      );
      write({
        done: true,
        ...recipe,
        servings: jsonLd?.servings ?? recipe.servings,
        nutrition: jsonLd?.nutrition ?? recipe.nutrition,
        steps: resolveStepImages(recipe.steps, visionFilenames),
        photoUrl,
        provider,
      });
    } catch (err) {
      writeExtractionError(write, err, AiTaskError);
    }
  });
}
