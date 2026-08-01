import { requireApiUser } from "@/lib/auth";
import { extractTextFromImage, extractTextFromPdf } from "@/lib/ocr/extractText";
import { extractRecipe, AiExtractionError } from "@/lib/ai/extractRecipe";
import { streamNdjson } from "@/lib/ndjson";
import { MAX_UPLOAD_BYTES } from "@/lib/uploads";
import { isRateLimited, recordAttempt } from "@/lib/rateLimit";

const MIN_PDF_TEXT_LENGTH = 50;
const IMPORT_RATE_LIMIT = 6;
const IMPORT_RATE_WINDOW_MS = 5 * 60_000;

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

  return streamNdjson(async (write) => {
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
      if (err instanceof AiExtractionError) {
        write({ done: true, error: err.message });
      } else {
        write({ done: true, error: "Estrazione AI non riuscita" });
      }
    }
  });
}
