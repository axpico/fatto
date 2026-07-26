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
