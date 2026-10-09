// Undo window for destructive actions: the request is only sent after `delayMs`, unless the
// returned cancel() runs first. Pending commits live at module level, so they survive
// client-side navigation (the page that scheduled them may unmount), and are flushed right away
// on pagehide (tab closed/reloaded) — `run` should use fetch keepalive for that last case.
type Pending = { timer: ReturnType<typeof setTimeout>; run: () => void };

const pending = new Set<Pending>();
let listening = false;

function flushAll() {
  for (const p of [...pending]) {
    clearTimeout(p.timer);
    pending.delete(p);
    p.run();
  }
}

export function deferCommit(run: () => void, delayMs: number): () => void {
  if (!listening && typeof window !== "undefined") {
    window.addEventListener("pagehide", flushAll);
    listening = true;
  }
  const p: Pending = {
    timer: setTimeout(() => {
      pending.delete(p);
      run();
    }, delayMs),
    run,
  };
  pending.add(p);
  return () => {
    clearTimeout(p.timer);
    pending.delete(p);
  };
}
