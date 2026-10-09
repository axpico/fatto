import { mkdir, writeFile, unlink } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import sharp from "sharp";
import { env } from "@/lib/env";
import { fetchPublic } from "@/lib/urlSafety";

const MAX_WIDTH = 1600;
import { MAX_UPLOAD_BYTES } from "@/lib/uploadLimits";

export { MAX_UPLOAD_BYTES };

export class UploadError extends Error {}

// Unico punto in cui passa ogni upload (foto ricetta, galleria, immagini step, fotogrammi reel):
// controllo qui dimensione/tipo invece che in ciascun chiamante.
export async function saveUpload(file: File): Promise<string> {
  if (file.size > MAX_UPLOAD_BYTES) {
    throw new UploadError("Immagine troppo grande (max 8MB)");
  }
  if (!file.type.startsWith("image/")) {
    throw new UploadError("Formato immagine non supportato");
  }

  await mkdir(env.UPLOAD_DIR, { recursive: true });

  const filename = `${randomUUID()}.jpg`;
  const original = Buffer.from(await file.arrayBuffer());
  let resized: Buffer;
  try {
    resized = await sharp(original)
      .rotate()
      .resize({ width: MAX_WIDTH, withoutEnlargement: true })
      .jpeg({ quality: 82 })
      .toBuffer();
  } catch {
    // the MIME type is client-declared: corrupt/non-image data is a 400, not a server error
    throw new UploadError("Immagine non valida o danneggiata");
  }
  await writeFile(path.join(env.UPLOAD_DIR, filename), resized);

  return filename;
}

export async function deleteUpload(filename: string | null | undefined) {
  // mai uscire da UPLOAD_DIR, anche se un nome sporco è finito nel DB
  if (!filename || filename !== path.basename(filename)) return;
  try {
    await unlink(path.join(env.UPLOAD_DIR, filename));
  } catch {
    // ponytail: file già assente/non trovato, nulla da fare
  }
}

// ponytail: usato per foto di copertina e immagini dei passaggi durante l'import — un bonus
// best-effort, qualsiasi fallimento viene ignorato silenziosamente, non deve mai far fallire l'import
export async function fetchImageBuffer(url: string): Promise<{ buffer: Buffer; contentType: string } | null> {
  try {
    const res = await fetchPublic(url, { signal: AbortSignal.timeout(5000), maxBytes: MAX_UPLOAD_BYTES });
    if (!res.ok) {
      console.error(`[uploads] fetchImageBuffer: HTTP ${res.status} per ${url}`);
      return null;
    }
    const contentType = res.headers.get("content-type") ?? "";
    if (!contentType.startsWith("image/")) {
      console.error(`[uploads] fetchImageBuffer: content-type non immagine ("${contentType}") per ${url}`);
      return null;
    }
    const buffer = Buffer.from(await res.arrayBuffer());
    if (buffer.byteLength > MAX_UPLOAD_BYTES) {
      console.error(`[uploads] fetchImageBuffer: immagine troppo grande (${buffer.byteLength} byte) per ${url}`);
      return null;
    }
    return { buffer, contentType };
  } catch (err) {
    console.error(`[uploads] fetchImageBuffer: richiesta fallita per ${url}:`, err);
    return null;
  }
}

export async function saveUploadFromBuffer(buffer: Buffer, contentType: string): Promise<string> {
  return saveUpload(new File([new Uint8Array(buffer)], "download.jpg", { type: contentType }));
}
