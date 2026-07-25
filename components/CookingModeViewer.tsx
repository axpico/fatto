"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { X, ChevronLeft, ChevronRight } from "lucide-react";

type Step = { id: string; instruction: string; timerMinutes: number | null };

function playBeep() {
  const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  const ctx = new Ctx();
  const oscillator = ctx.createOscillator();
  const gain = ctx.createGain();
  oscillator.frequency.value = 880;
  gain.gain.setValueAtTime(0.3, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6);
  oscillator.connect(gain).connect(ctx.destination);
  oscillator.start();
  oscillator.stop(ctx.currentTime + 0.6);
}

function useWakeLock() {
  useEffect(() => {
    let lock: WakeLockSentinel | null = null;

    async function acquire() {
      try {
        if ("wakeLock" in navigator) {
          lock = await navigator.wakeLock.request("screen");
        }
      } catch {
        // ponytail: wake lock non supportato/negato, la cottura funziona comunque
      }
    }

    acquire();
    document.addEventListener("visibilitychange", acquire);

    return () => {
      document.removeEventListener("visibilitychange", acquire);
      lock?.release().catch(() => {});
    };
  }, []);
}

function useStepTimer(minutes: number | null) {
  // reset del timer quando si cambia passaggio (pattern React: adjust state during render, non in un effect)
  const [trackedMinutes, setTrackedMinutes] = useState(minutes);
  const [remaining, setRemaining] = useState<number | null>(null);

  if (minutes !== trackedMinutes) {
    setTrackedMinutes(minutes);
    setRemaining(null);
  }

  useEffect(() => {
    if (remaining === null || remaining <= 0) return;
    const id = setTimeout(() => setRemaining((r) => (r ?? 1) - 1), 1000);
    return () => clearTimeout(id);
  }, [remaining]);

  // remaining passa a 0 una sola volta per countdown (poi l'effect sopra si ferma), quindi l'effect
  // seguente scatta esattamente una volta a fine timer, senza bisogno di un flag "già suonato"
  useEffect(() => {
    if (remaining === 0) {
      playBeep();
      navigator.vibrate?.(500);
    }
  }, [remaining]);

  function start() {
    if (minutes === null) return;
    setRemaining(minutes * 60);
  }

  return { remaining, start };
}

export function CookingModeViewer({ recipeId, steps }: { recipeId: string; steps: Step[] }) {
  const router = useRouter();
  const [index, setIndex] = useState(0);
  const touchStartX = useRef<number | null>(null);

  useWakeLock();

  const step = steps[index];
  const timer = useStepTimer(step?.timerMinutes ?? null);

  function next() {
    setIndex((i) => Math.min(i + 1, steps.length - 1));
  }
  function prev() {
    setIndex((i) => Math.max(i - 1, 0));
  }

  function handleTouchStart(e: React.TouchEvent) {
    touchStartX.current = e.touches[0].clientX;
  }
  function handleTouchEnd(e: React.TouchEvent) {
    if (touchStartX.current === null) return;
    const delta = e.changedTouches[0].clientX - touchStartX.current;
    if (Math.abs(delta) > 50) {
      if (delta < 0) next();
      else prev();
    }
    touchStartX.current = null;
  }

  if (!step) return null;

  const minutes = timer.remaining !== null ? Math.floor(timer.remaining / 60) : null;
  const seconds = timer.remaining !== null ? timer.remaining % 60 : null;

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col bg-neutral-950 text-white"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      <div className="flex items-center justify-between p-4">
        <span className="text-sm text-neutral-400">
          Passaggio {index + 1} di {steps.length}
        </span>
        <button
          type="button"
          onClick={() => router.push(`/recipes/${recipeId}`)}
          aria-label="Chiudi modalità cottura"
          className="rounded-full p-2 text-neutral-400 hover:text-white"
        >
          <X className="h-6 w-6" aria-hidden="true" />
        </button>
      </div>

      <div className="flex flex-1 flex-col items-center justify-center gap-8 px-6 text-center">
        <p className="text-3xl font-medium leading-snug">{step.instruction}</p>

        {step.timerMinutes !== null && (
          <div className="flex flex-col items-center gap-3">
            {timer.remaining !== null ? (
              <span className="text-5xl font-bold tabular-nums">
                {String(minutes).padStart(2, "0")}:{String(seconds).padStart(2, "0")}
              </span>
            ) : (
              <button
                type="button"
                onClick={timer.start}
                className="rounded-full bg-primary px-6 py-4 text-lg font-medium hover:bg-primary-hover"
              >
                Avvia timer {step.timerMinutes} min
              </button>
            )}
          </div>
        )}
      </div>

      <div className="flex gap-3 p-4 pb-8">
        <button
          type="button"
          onClick={prev}
          disabled={index === 0}
          className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-neutral-800 py-6 text-xl font-medium disabled:opacity-30"
        >
          <ChevronLeft className="h-5 w-5" aria-hidden="true" /> Indietro
        </button>
        <button
          type="button"
          onClick={next}
          disabled={index === steps.length - 1}
          className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-primary py-6 text-xl font-medium disabled:opacity-30"
        >
          Avanti <ChevronRight className="h-5 w-5" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}
