import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { mkdtemp, rm, readdir, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import os from "node:os";
import path from "node:path";
import { extractRecipe } from "@/lib/ai/extractRecipe";
import { saveUpload } from "@/lib/uploads";
import type { VisionImage } from "@/lib/ai/visionImage";
import { isValidVideoUrl, type VideoPlatform } from "@/lib/videoPlatforms";
import { resolveStepImages, type ExtractedRecipe, type StepWithImage } from "@/lib/ai/schema";

const run = promisify(execFile);

export type { VideoPlatform };

const PLATFORM_INVALID_URL_MESSAGE: Record<VideoPlatform, string> = {
  instagram: "Il link non sembra un Reel Instagram valido (instagram.com/reel/... o /p/...)",
  youtube: "Il link non sembra un video YouTube valido (youtube.com/watch?v=... o /shorts/...)",
  tiktok: "Il link non sembra un video TikTok valido (tiktok.com/@utente/video/...)",
};

const WHISPER_MODEL_PATH = "/app/whisper-models/ggml-small-q5_1.bin";

// ponytail: nessun limite di durata sui video (deciso dall'utente) — niente coda di job, tutto
// sincrono in una singola richiesta HTTP in streaming NDJSON. I timeout sono generosi perché la
// trascrizione di un video lungo su CPU è il vero collo di bottiglia.
const YT_DLP_TIMEOUT_MS = 600_000;
const FFPROBE_TIMEOUT_MS = 15_000;
const FFMPEG_AUDIO_TIMEOUT_MS = 120_000;
const FFMPEG_FRAME_TIMEOUT_MS = 20_000;
const WHISPER_TIMEOUT_MS = 3_600_000;
const FRAME_COUNT = 6;

export class VideoImportError extends Error {}

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

// ponytail: euristica sul testo stderr di yt-dlp — se yt-dlp cambia formato di output e questo
// smette di classificare correttamente, passare a un controllo su exit code/error code strutturato
function classifyYtDlpError(err: unknown): string {
  const e = err as { killed?: boolean; stderr?: string } | undefined;
  if (e?.killed) {
    return "Il download del video ha impiegato troppo tempo (connessione lenta o video molto lungo). Riprova.";
  }
  if (e?.stderr && /unavailable|not available|private|login required|does not exist|removed/i.test(e.stderr)) {
    return "Questo video è privato, è stato rimosso o non è più disponibile.";
  }
  if (e?.stderr && /rate.?limit|429|try again later|confirm you.?re not a bot/i.test(e.stderr)) {
    return "La piattaforma ha limitato temporaneamente le richieste. Riprova tra qualche minuto.";
  }
  if (
    e?.stderr &&
    /name or service not known|temporary failure in name resolution|connection refused|network is unreachable|could not resolve host/i.test(
      e.stderr,
    )
  ) {
    return "Errore di rete durante il download del video: controlla la connessione e riprova.";
  }
  return "Impossibile scaricare il video: controlla il link e riprova, oppure aggiungi le note manuali.";
}

async function extractFrames(dir: string, videoPath: string): Promise<VisionImage[]> {
  let duration: number;
  try {
    const { stdout } = await run(
      "ffprobe",
      ["-v", "error", "-show_entries", "format=duration", "-of", "default=noprint_wrappers=1:nokey=1", videoPath],
      { timeout: FFPROBE_TIMEOUT_MS },
    );
    duration = Number(stdout.trim());
    if (!Number.isFinite(duration) || duration <= 0) return [];
  } catch (err) {
    console.error("[video] durata video non disponibile, niente fotogrammi estratti:", err);
    return [];
  }

  const frames: VisionImage[] = [];
  for (let i = 1; i <= FRAME_COUNT; i++) {
    const t = ((duration * i) / (FRAME_COUNT + 1)).toFixed(2);
    const framePath = path.join(dir, `frame_${i}.jpg`);
    try {
      await run("ffmpeg", ["-ss", t, "-i", videoPath, "-frames:v", "1", "-q:v", "3", "-y", framePath], {
        timeout: FFMPEG_FRAME_TIMEOUT_MS,
      });
      frames.push({ data: await readFile(framePath), mediaType: "image/jpeg" });
    } catch (err) {
      // best-effort: un fotogramma mancante non deve bloccare l'import
      console.error(`[video] estrazione fotogramma ${i} fallita:`, err);
    }
  }
  return frames;
}

type VideoImportResult = {
  recipe: Omit<ExtractedRecipe, "steps"> & { steps: StepWithImage[] };
  provider: string;
  galleryFilenames: string[];
  photoUrl: string | null;
  warnings: string[];
};

// ponytail: execFile con array di argomenti ovunque, mai shell:true — l'URL è input utente e non
// deve mai poter raggiungere una shell.
export async function importFromVideo(
  url: string,
  notes: string | undefined,
  platform: VideoPlatform,
  onProgress?: (stage: string) => void,
  signal?: AbortSignal,
): Promise<VideoImportResult> {
  if (!isValidVideoUrl(platform, url)) {
    throw new VideoImportError(PLATFORM_INVALID_URL_MESSAGE[platform]);
  }
  const trimmedNotes = notes?.trim();

  const dir = await mkdtemp(path.join(tmpdir(), "video-"));
  try {
    let meta: YtDlpMetadata | null = null;
    let videoFile: string | null = null;
    let downloadError: unknown;

    onProgress?.("Scaricando video...");
    try {
      const { stdout } = await run(
        "yt-dlp",
        [
          url,
          "-o",
          "video.%(ext)s",
          "--no-simulate",
          "--dump-json",
          "--write-comments",
          "--no-playlist",
          "-S",
          "res:480",
        ],
        { cwd: dir, timeout: YT_DLP_TIMEOUT_MS, maxBuffer: 10 * 1024 * 1024, signal },
      );
      meta = JSON.parse(stdout);
      videoFile = (await readdir(dir)).find((f) => f.startsWith("video.")) ?? null;
    } catch (err) {
      console.error("[video] download yt-dlp fallito:", err);
      downloadError = err;
    }

    signal?.throwIfAborted();
    if (!videoFile) {
      if (!trimmedNotes) {
        throw new VideoImportError(`${classifyYtDlpError(downloadError)} Aggiungi le note manuali e riprova.`);
      }
      onProgress?.("Estraendo ricetta...");
      const { recipe, provider } = await extractRecipe(buildText({ notes: trimmedNotes }));
      return {
        recipe: { ...recipe, steps: resolveStepImages(recipe.steps, []) },
        provider,
        galleryFilenames: [],
        photoUrl: null,
        warnings: ["Il video non è stato scaricato: la ricetta si basa solo sulle note che hai inserito."],
      };
    }

    const caption = meta?.description?.trim() ?? "";
    // best-effort: alcuni estrattori di yt-dlp popolano "comments" con fatal=False, quindi se
    // l'endpoint commenti nega l'accesso il campo è semplicemente assente, non un errore
    const comments = (meta?.comments ?? [])
      .map((c) => c.text?.trim())
      .filter((t): t is string => Boolean(t))
      .join("\n");

    const videoPath = path.join(dir, videoFile);

    let transcript = "";
    onProgress?.("Trascrivendo audio...");
    try {
      const audioPath = path.join(dir, "audio.wav");
      await run(
        "ffmpeg",
        ["-i", videoPath, "-vn", "-ar", "16000", "-ac", "1", "-c:a", "pcm_s16le", audioPath],
        { timeout: FFMPEG_AUDIO_TIMEOUT_MS, signal },
      );
      const { stdout } = await run(
        "whisper-cli",
        ["-m", WHISPER_MODEL_PATH, "-f", audioPath, "-l", "auto", "-nt", "-t", String(os.availableParallelism())],
        { timeout: WHISPER_TIMEOUT_MS, maxBuffer: 10 * 1024 * 1024, signal },
      );
      transcript = stdout.trim();
    } catch (err) {
      // niente audio parlato, o trascrizione fallita: non bloccante, si prosegue con quel che c'è
      console.error("[video] trascrizione audio non disponibile:", err);
    }

    signal?.throwIfAborted();
    onProgress?.("Estraendo fotogrammi...");
    const frames = await extractFrames(dir, videoPath);

    const warnings: string[] = [];
    if (!transcript) {
      warnings.push("Nessun parlato rilevato nell'audio: la ricetta si basa su didascalia, commenti e note.");
    }
    if (frames.length === 0) {
      warnings.push("Non è stato possibile estrarre fotogrammi dal video.");
    }

    signal?.throwIfAborted();
    onProgress?.("Estraendo ricetta...");
    const { recipe, provider } = await extractRecipe(
      buildText({ transcript, caption, comments, notes: trimmedNotes }),
      frames,
    );
    const galleryFilenames = await Promise.all(
      frames.map((f) => saveUpload(new File([new Uint8Array(f.data)], "frame.jpg", { type: f.mediaType }))),
    );
    // Le ricette da cucina finiscono quasi sempre sul piatto pronto: l'ultimo fotogramma è la
    // copertina di default migliore senza dover chiedere al modello AI di sceglierne una.
    const photoUrl = galleryFilenames.length > 0 ? galleryFilenames[galleryFilenames.length - 1] : null;

    return {
      recipe: { ...recipe, steps: resolveStepImages(recipe.steps, galleryFilenames) },
      provider,
      galleryFilenames,
      photoUrl,
      warnings,
    };
  } finally {
    await rm(dir, { recursive: true, force: true }).catch(() => {});
  }
}
