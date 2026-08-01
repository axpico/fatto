import path from "node:path";
import { readFile } from "node:fs/promises";
import { env } from "@/lib/env";
import { requireApiUser } from "@/lib/auth";

const MIME_BY_EXT: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".gif": "image/gif",
};

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ filename: string }> },
) {
  const { unauthorized } = await requireApiUser();
  if (unauthorized) return unauthorized;

  const { filename } = await params;
  if (filename.includes("/") || filename.includes("..")) {
    return new Response("Nome file non valido", { status: 400 });
  }

  try {
    const buffer = await readFile(path.join(env.UPLOAD_DIR, filename));
    const ext = path.extname(filename).toLowerCase();
    return new Response(new Uint8Array(buffer), {
      headers: {
        "Content-Type": MIME_BY_EXT[ext] ?? "application/octet-stream",
        "Cache-Control": "private, max-age=31536000, immutable",
      },
    });
  } catch {
    return new Response("Non trovato", { status: 404 });
  }
}
