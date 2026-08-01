import { z } from "zod";
import { requireApiUser } from "@/lib/auth";
import { htmlToText } from "@/lib/ai/htmlToText";
import { extractRecipe, AiExtractionError } from "@/lib/ai/extractRecipe";
import { extractJsonLdRecipe } from "@/lib/ai/jsonLd";
import { fetchImageBuffer, saveUploadFromBuffer } from "@/lib/uploads";
import { MAX_VISION_IMAGES, type VisionImage } from "@/lib/ai/visionImage";
import { streamNdjson } from "@/lib/ndjson";
import { assertPublicUrl } from "@/lib/urlSafety";
import { isRateLimited, recordAttempt } from "@/lib/rateLimit";

const bodySchema = z.object({ url: z.string().url() });
const IMPORT_RATE_LIMIT = 6;
const IMPORT_RATE_WINDOW_MS = 5 * 60_000;

const VISION_MIME_TYPES = new Set<VisionImage["mediaType"]>([
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
]);

// Risposta NDJSON in streaming, stesso pattern di app/api/import/reel/route.ts: una riga
// { stage } per avanzamento, poi una riga finale { done: true, ...ricetta } o { done: true, error }.
export async function POST(request: Request) {
  const { user, unauthorized } = await requireApiUser();
  if (unauthorized) return unauthorized;

  const rateKey = `import:${user.id}`;
  if (isRateLimited(rateKey, IMPORT_RATE_LIMIT, IMPORT_RATE_WINDOW_MS)) {
    return Response.json({ error: "Troppe importazioni, riprova tra qualche minuto." }, { status: 429 });
  }
  recordAttempt(rateKey, IMPORT_RATE_WINDOW_MS);

  const body = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success || !/^https?:\/\//i.test(parsed.data.url)) {
    return Response.json({ error: "Link non valido" }, { status: 400 });
  }

  return streamNdjson(async (write) => {
    try {
      write({ stage: "Scaricando pagina..." });
      let html: string;
      try {
        await assertPublicUrl(parsed.data.url);
        const res = await fetch(parsed.data.url, { signal: AbortSignal.timeout(10000) });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        html = await res.text();
      } catch {
        write({ done: true, error: "Impossibile scaricare la pagina. Controlla il link e riprova." });
        return;
      }

      const jsonLd = extractJsonLdRecipe(html);

      const coverFetched = jsonLd?.imageUrl ? await fetchImageBuffer(jsonLd.imageUrl) : null;
      const stepFetched = jsonLd?.stepImageUrls
        ? await Promise.all(
            jsonLd.stepImageUrls.map((url) => (url ? fetchImageBuffer(url) : Promise.resolve(null))),
          )
        : [];

      const visionImages: VisionImage[] = [coverFetched, ...stepFetched]
        .filter((f): f is { buffer: Buffer; contentType: string } => f != null)
        .filter((f) => VISION_MIME_TYPES.has(f.contentType as VisionImage["mediaType"]))
        .slice(0, MAX_VISION_IMAGES)
        .map((f) => ({ data: f.buffer, mediaType: f.contentType as VisionImage["mediaType"] }));

      write({ stage: "Estraendo ricetta..." });
      const { recipe, provider } = await extractRecipe(htmlToText(html), visionImages);
      const photoUrl = coverFetched ? await saveUploadFromBuffer(coverFetched.buffer, coverFetched.contentType) : null;
      const stepImageFilenames = stepFetched.length
        ? await Promise.all(
            stepFetched.map((f) => (f ? saveUploadFromBuffer(f.buffer, f.contentType) : Promise.resolve(null))),
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
    }
  });
}
