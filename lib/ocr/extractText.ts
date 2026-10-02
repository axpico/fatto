import { createWorker } from "tesseract.js";
import { PDFParse } from "pdf-parse";
import { env } from "@/lib/env";

export async function extractTextFromImage(buffer: Buffer): Promise<string> {
  const worker = await createWorker("ita+eng", undefined, {
    ...(env.TESSDATA_PREFIX ? { langPath: env.TESSDATA_PREFIX } : {}),
  });
  try {
    const { data } = await worker.recognize(buffer);
    return data.text;
  } finally {
    await worker.terminate();
  }
}

export async function extractTextFromPdf(buffer: Buffer): Promise<string> {
  const parser = new PDFParse({ data: buffer });
  try {
    const result = await parser.getText();
    return result.text;
  } finally {
    await parser.destroy();
  }
}
