import { requireApiUser } from "@/lib/auth";
import { extractTextFromImage, extractTextFromPdf } from "@/lib/ocr/extractText";
import { extractRecipe, AiExtractionError } from "@/lib/ai/extractRecipe";

const MIN_PDF_TEXT_LENGTH = 50;

export async function POST(request: Request) {
  const { unauthorized } = await requireApiUser();
  if (unauthorized) return unauthorized;

  const formData = await request.formData();
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return Response.json({ error: "Nessun file caricato" }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());

  let rawText: string;
  if (file.type === "application/pdf") {
    rawText = await extractTextFromPdf(buffer);
    if (rawText.trim().length < MIN_PDF_TEXT_LENGTH) {
      return Response.json(
        { error: "Questo PDF sembra una scansione: carica uno screenshot invece" },
        { status: 422 },
      );
    }
  } else if (file.type.startsWith("image/")) {
    rawText = await extractTextFromImage(buffer);
  } else {
    return Response.json({ error: "Formato file non supportato" }, { status: 400 });
  }

  try {
    const recipe = await extractRecipe(rawText);
    return Response.json(recipe);
  } catch (err) {
    if (err instanceof AiExtractionError) {
      return Response.json({ error: err.message }, { status: 422 });
    }
    return Response.json({ error: "Estrazione AI non riuscita" }, { status: 422 });
  }
}
