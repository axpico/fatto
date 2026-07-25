import { mkdir, writeFile, unlink } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { env } from "@/lib/env";

export async function saveUpload(file: File): Promise<string> {
  await mkdir(env.UPLOAD_DIR, { recursive: true });

  const ext = path.extname(file.name).slice(0, 10);
  const filename = `${randomUUID()}${ext}`;
  const buffer = Buffer.from(await file.arrayBuffer());
  await writeFile(path.join(env.UPLOAD_DIR, filename), buffer);

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
