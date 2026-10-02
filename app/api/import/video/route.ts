import { z } from "zod";
import { requireApiUser } from "@/lib/auth";
import { importFromVideo, VideoImportError } from "@/lib/videoImport";
import { AiTaskError } from "@/lib/ai/runAiTask";
import { streamNdjson, writeExtractionError } from "@/lib/ndjson";
import { checkImportRateLimit } from "@/lib/rateLimit";

const bodySchema = z.object({
  url: z.string().url(),
  notes: z.string().optional(),
  platform: z.enum(["instagram", "youtube", "tiktok"]),
});

// Risposta NDJSON in streaming: una riga { stage } per ogni avanzamento, poi una riga finale
// { done: true, ...ricetta } o { done: true, error }. Il client legge riga per riga per mostrare
// un'etichetta di caricamento aggiornata durante un'operazione che può durare diversi minuti.
export async function POST(request: Request) {
  const { user, unauthorized } = await requireApiUser();
  if (unauthorized) return unauthorized;

  const rateLimited = checkImportRateLimit(user.id);
  if (rateLimited) return rateLimited;

  const body = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: "Link non valido" }, { status: 400 });
  }

  return streamNdjson(async (write) => {
    try {
      const { recipe, provider, galleryFilenames, photoUrl, warnings } = await importFromVideo(
        parsed.data.url,
        parsed.data.notes,
        parsed.data.platform,
        (stage) => write({ stage }),
      );
      write({ done: true, ...recipe, provider, galleryFilenames, photoUrl, warnings });
    } catch (err) {
      writeExtractionError(write, err, VideoImportError, AiTaskError);
    }
  });
}
