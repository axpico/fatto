/** Riga finale di errore per un import fallito: messaggio dell'errore per le classi "attese"
 * passate in knownErrors, messaggio generico per tutto il resto (bug, timeout, errori di rete). */
export function writeExtractionError(
  write: (line: object) => void,
  err: unknown,
  ...knownErrors: Array<new (...args: never[]) => Error>
): void {
  const isKnown = knownErrors.some((ErrorClass) => err instanceof ErrorClass);
  write({ done: true, error: isKnown ? (err as Error).message : "Estrazione AI non riuscita" });
}

/** `signal` is the request's: it aborts when the client cancels or leaves, so `run` can stop
 * expensive work (yt-dlp, whisper, AI calls) instead of finishing it for nobody. */
export function streamNdjson(
  signal: AbortSignal,
  run: (write: (line: object) => void, signal: AbortSignal) => Promise<void>,
): Response {
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      function write(line: object) {
        if (signal.aborted) return; // stream already cancelled by the client
        controller.enqueue(encoder.encode(JSON.stringify(line) + "\n"));
      }
      try {
        await run(write, signal);
      } finally {
        if (!signal.aborted) controller.close();
      }
    },
  });

  return new Response(stream, { headers: { "Content-Type": "application/x-ndjson" } });
}
