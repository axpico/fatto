import { mkdir, writeFile, unlink } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import sharp from "sharp";
import { env } from "@/lib/env";

const MAX_WIDTH = 1600;

export async function saveUpload(file: File): Promise<string> {
  await mkdir(env.UPLOAD_DIR, { recursive: true });

  const filename = `${randomUUID()}.jpg`;
  const original = Buffer.from(await file.arrayBuffer());
  const resized = await sharp(original)
    .rotate()
    .resize({ width: MAX_WIDTH, withoutEnlargement: true })
    .jpeg({ quality: 82 })
    .toBuffer();
  await writeFile(path.join(env.UPLOAD_DIR, filename), resized);

  return filename;
}

export async function deleteUpload(filename: string | null | undefined) {
  if (!filename) return;
  try {
    await unlink(path.join(env.UPLOAD_DIR, filename));
  } catch {
    // ponytail: file già assente/non trovato, nulla da fare
  }
}

const MAX_URL_IMAGE_BYTES = 8 * 1024 * 1024;

// ponytail: usato per foto di copertina e immagini dei passaggi durante l'import — un bonus
// best-effort, qualsiasi fallimento viene ignorato silenziosamente, non deve mai far fallire l'import
export async function fetchImageBuffer(url: string): Promise<{ buffer: Buffer; contentType: string } | null> {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
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
    if (buffer.byteLength > MAX_URL_IMAGE_BYTES) {
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
