import { z } from "zod";
import { requireApiUser } from "@/lib/auth";
import { importFromReel, ReelImportError } from "@/lib/reelImport";
import { AiExtractionError } from "@/lib/ai/extractRecipe";

const bodySchema = z.object({ url: z.string().url(), notes: z.string().optional() });

// Risposta NDJSON in streaming: una riga { stage } per ogni avanzamento, poi una riga finale
// { done: true, ...ricetta } o { done: true, error }. Il client legge riga per riga per mostrare
// un'etichetta di caricamento aggiornata durante un'operazione che può durare 60-120s+.
export async function POST(request: Request) {
  const { unauthorized } = await requireApiUser();
  if (unauthorized) return unauthorized;

  const body = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: "Link non valido" }, { status: 400 });
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      function write(line: object) {
        controller.enqueue(encoder.encode(JSON.stringify(line) + "\n"));
      }
      try {
        const { recipe, provider, galleryFilenames } = await importFromReel(
          parsed.data.url,
          parsed.data.notes,
          (stage) => write({ stage }),
        );
        write({ done: true, ...recipe, provider, galleryFilenames });
      } catch (err) {
        if (err instanceof ReelImportError || err instanceof AiExtractionError) {
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
