import { requireApiUser } from "@/lib/auth";
import { extractTextFromImage, extractTextFromPdf } from "@/lib/ocr/extractText";
import { extractRecipe } from "@/lib/ai/extractRecipe";
import { AiTaskError } from "@/lib/ai/runAiTask";
import { streamNdjson, writeExtractionError } from "@/lib/ndjson";
import { MAX_UPLOAD_BYTES } from "@/lib/uploads";
import { checkImportRateLimit } from "@/lib/rateLimit";

const MIN_PDF_TEXT_LENGTH = 50;

// Risposta NDJSON in streaming, stesso pattern di app/api/import/video/route.ts: una riga
// { stage } per avanzamento, poi una riga finale { done: true, ...ricetta } o { done: true, error }.
export async function POST(request: Request) {
  const { user, unauthorized } = await requireApiUser();
  if (unauthorized) return unauthorized;

  const rateLimited = checkImportRateLimit(user.id);
  if (rateLimited) return rateLimited;

  const formData = await request.formData();
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return Response.json({ error: "Nessun file caricato" }, { status: 400 });
  }
  if (file.type !== "application/pdf" && !file.type.startsWith("image/")) {
    return Response.json({ error: "Formato file non supportato" }, { status: 400 });
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    return Response.json({ error: "File troppo grande (max 8MB)" }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());

  return streamNdjson(request.signal, async (write) => {
    try {
      write({ stage: "Leggendo il file..." });
      let rawText: string;
      if (file.type === "application/pdf") {
        rawText = await extractTextFromPdf(buffer);
        if (rawText.trim().length < MIN_PDF_TEXT_LENGTH) {
          write({ done: true, error: "Questo PDF sembra una scansione: carica uno screenshot invece" });
          return;
        }
      } else {
        rawText = await extractTextFromImage(buffer);
      }

      write({ stage: "Estraendo ricetta..." });
      const { recipe, provider } = await extractRecipe(rawText);
      write({ done: true, ...recipe, provider });
    } catch (err) {
      writeExtractionError(write, err, AiTaskError);
    }
  });
}
