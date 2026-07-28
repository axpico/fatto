export function streamNdjson(run: (write: (line: object) => void) => Promise<void>): Response {
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      function write(line: object) {
        controller.enqueue(encoder.encode(JSON.stringify(line) + "\n"));
      }
      try {
        await run(write);
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, { headers: { "Content-Type": "application/x-ndjson" } });
}
