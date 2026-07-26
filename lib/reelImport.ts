import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { mkdtemp, rm, readdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { extractRecipe, type ExtractionResult } from "@/lib/ai/extractRecipe";

const run = promisify(execFile);

// Solo reel/post pubblici singoli: niente Stories, niente caroselli multi-immagine (fuori scope).
const REEL_URL_PATTERN = /^https:\/\/(www\.)?instagram\.com\/(p|reel)\/[A-Za-z0-9_-]+\/?/i;

const WHISPER_MODEL_PATH = "/app/whisper-models/ggml-small-q5_1.bin";

export class ReelImportError extends Error {}

interface YtDlpMetadata {
  description?: string;
  comments?: { text?: string }[];
}

function buildText(parts: { transcript?: string; caption?: string; comments?: string; notes?: string }): string {
  const blocks: string[] = [];
  if (parts.transcript) blocks.push(`--- TRASCRIZIONE AUDIO ---\n${parts.transcript}`);
  if (parts.caption) blocks.push(`--- DESCRIZIONE ---\n${parts.caption}`);
  if (parts.comments) blocks.push(`--- COMMENTI ---\n${parts.comments}`);
  if (parts.notes) blocks.push(`--- NOTE UTENTE ---\n${parts.notes}`);
  return blocks.join("\n\n");
}

// ponytail: execFile con array di argomenti ovunque, mai shell:true — l'URL è input utente e non
// deve mai poter raggiungere una shell.
export async function importFromReel(
  url: string,
  notes?: string,
  onProgress?: (stage: string) => void,
): Promise<ExtractionResult> {
  if (!REEL_URL_PATTERN.test(url)) {
    throw new ReelImportError("Il link non sembra un Reel Instagram valido (instagram.com/reel/... o /p/...)");
  }
  const trimmedNotes = notes?.trim();

  const dir = await mkdtemp(path.join(tmpdir(), "reel-"));
  try {
    let meta: YtDlpMetadata | null = null;
    let videoFile: string | null = null;

    onProgress?.("Scaricando video...");
    try {
      const { stdout } = await run(
        "yt-dlp",
        [url, "-o", "video.%(ext)s", "--no-simulate", "--dump-json", "--write-comments", "--no-playlist"],
        { cwd: dir, timeout: 60_000, maxBuffer: 10 * 1024 * 1024 },
      );
      meta = JSON.parse(stdout);
      videoFile = (await readdir(dir)).find((f) => f.startsWith("video.")) ?? null;
    } catch (err) {
      console.error("[reel] download yt-dlp fallito:", err);
    }

    if (!videoFile) {
      if (!trimmedNotes) {
        throw new ReelImportError(
          "Impossibile scaricare il reel: privato, rimosso o non raggiungibile. Aggiungi le note manuali e riprova.",
        );
      }
      onProgress?.("Estraendo ricetta...");
      return extractRecipe(buildText({ notes: trimmedNotes }));
    }

    const caption = meta?.description?.trim() ?? "";
    // best-effort: l'estrattore Instagram di yt-dlp popola "comments" con fatal=False, quindi se
    // l'endpoint commenti nega l'accesso il campo è semplicemente assente, non un errore
    const comments = (meta?.comments ?? [])
      .map((c) => c.text?.trim())
      .filter((t): t is string => Boolean(t))
      .join("\n");

    let transcript = "";
    onProgress?.("Trascrivendo audio...");
    try {
      const audioPath = path.join(dir, "audio.wav");
      await run(
        "ffmpeg",
        ["-i", path.join(dir, videoFile), "-vn", "-ar", "16000", "-ac", "1", "-c:a", "pcm_s16le", audioPath],
        { timeout: 30_000 },
      );
      const { stdout } = await run(
        "whisper-cli",
        ["-m", WHISPER_MODEL_PATH, "-f", audioPath, "-l", "auto", "-nt"],
        { timeout: 120_000, maxBuffer: 10 * 1024 * 1024 },
      );
      transcript = stdout.trim();
    } catch (err) {
      // niente audio parlato, o trascrizione fallita: non bloccante, si prosegue con quel che c'è
      console.error("[reel] trascrizione audio non disponibile:", err);
    }

    onProgress?.("Estraendo ricetta...");
    return extractRecipe(buildText({ transcript, caption, comments, notes: trimmedNotes }));
  } finally {
    await rm(dir, { recursive: true, force: true }).catch(() => {});
  }
}
