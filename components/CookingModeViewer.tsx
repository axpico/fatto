"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { X, ChevronLeft, ChevronRight, Mic, MicOff, List, Pause, Play, Square } from "lucide-react";
import { matchVoiceCommand } from "@/lib/voiceCommands";
import { Modal, type ModalHandle } from "@/components/ui/Modal";
import { ServingsAdjuster } from "@/components/ServingsAdjuster";
import { Badge } from "@/components/ui/Badge";
import { StarRating } from "@/components/ui/StarRating";
import { useToast } from "@/components/ui/Toast";
import { reportIfFailed } from "@/lib/apiError";

type Step = {
  id: string;
  instruction: string;
  timerMinutes: number | null;
  optional: boolean;
  imageFilename: string | null;
};
type Ingredient = { id: string; name: string; quantity: number | null; unit: string | null; optional: boolean };

function requiredProgress(steps: Step[], index: number) {
  const total = Math.max(steps.filter((s) => !s.optional).length, 1);
  const current = steps.slice(0, index + 1).filter((s) => !s.optional).length;
  return { current, total };
}

type SpeechRecognitionLike = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((event: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
};

function getSpeechRecognitionCtor(): (new () => SpeechRecognitionLike) | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as {
    SpeechRecognition?: new () => SpeechRecognitionLike;
    webkitSpeechRecognition?: new () => SpeechRecognitionLike;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

// ponytail: nessun polyfill, il bottone microfono/la voce di risposta compaiono solo se il browser
// supporta le API native (SpeechRecognition / SpeechSynthesis)
function speak(text: string) {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = "it-IT";
  window.speechSynthesis.speak(utterance);
}

function useVoiceControl(actions: {
  next: () => void;
  prev: () => void;
  startTimer: () => void;
  repeat: () => void;
  jump: (step: number) => void;
  timeLeft: () => void;
}) {
  const [supported] = useState(() => getSpeechRecognitionCtor() !== null);
  const [listening, setListening] = useState(false);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const actionsRef = useRef(actions);

  useEffect(() => {
    actionsRef.current = actions;
  });

  useEffect(() => {
    return () => recognitionRef.current?.stop();
  }, []);

  function toggle() {
    if (listening) {
      recognitionRef.current?.stop();
      setListening(false);
      return;
    }
    const Ctor = getSpeechRecognitionCtor();
    if (!Ctor) return;
    const recognition = new Ctor();
    recognition.lang = "it-IT";
    recognition.continuous = true;
    recognition.interimResults = false;
    recognition.onresult = (event) => {
      const results = event.results;
      const transcript = results[results.length - 1][0].transcript;
      const command = matchVoiceCommand(transcript);
      if (!command) return;
      switch (command.type) {
        case "next":
          actionsRef.current.next();
          break;
        case "prev":
          actionsRef.current.prev();
          break;
        case "timer":
          actionsRef.current.startTimer();
          break;
        case "repeat":
          actionsRef.current.repeat();
          break;
        case "jump":
          actionsRef.current.jump(command.step);
          break;
        case "timeLeft":
          actionsRef.current.timeLeft();
          break;
      }
    };
    recognition.onend = () => setListening(false);
    recognition.start();
    recognitionRef.current = recognition;
    setListening(true);
  }

  return { supported, listening, toggle };
}

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
  const [paused, setPaused] = useState(false);

  if (minutes !== trackedMinutes) {
    setTrackedMinutes(minutes);
    setRemaining(null);
    setPaused(false);
  }

  useEffect(() => {
    if (remaining === null || remaining <= 0 || paused) return;
    const id = setTimeout(() => setRemaining((r) => (r ?? 1) - 1), 1000);
    return () => clearTimeout(id);
  }, [remaining, paused]);

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
    setPaused(false);
  }
  function togglePause() {
    setPaused((p) => !p);
  }
  function cancel() {
    setRemaining(null);
    setPaused(false);
  }

  return { remaining, paused, start, togglePause, cancel };
}

export function CookingModeViewer({
  recipeId,
  steps,
  ingredients,
  baseServings,
}: {
  recipeId: string;
  steps: Step[];
  ingredients: Ingredient[];
  baseServings: number;
}) {
  const router = useRouter();
  const toast = useToast();
  const [index, setIndex] = useState(0);
  const [announcement, setAnnouncement] = useState("");
  const [trackedIndex, setTrackedIndex] = useState(0);
  const [trackedRemaining, setTrackedRemaining] = useState<number | null>(null);
  const [marking, setMarking] = useState(false);
  const [cookLogId, setCookLogId] = useState<string | null>(null);
  const [rating, setRating] = useState<number | null>(null);
  const touchStartX = useRef<number | null>(null);
  const ingredientsModalRef = useRef<ModalHandle>(null);

  useWakeLock();

  const step = steps[index];
  const isDone = index === steps.length;
  const timer = useStepTimer(step?.timerMinutes ?? null);

  // annunci discreti (cambio passaggio, timer terminato) calcolati durante il render, non in un
  // effect, per evitare il pattern "setState sincrono dentro un effect" — stesso approccio di
  // useStepTimer sopra
  if (index !== trackedIndex) {
    setTrackedIndex(index);
    const p = requiredProgress(steps, Math.min(index, steps.length - 1));
    setAnnouncement(isDone ? "Ricetta completata" : `Passaggio ${p.current} di ${p.total}`);
  }
  if (timer.remaining !== trackedRemaining) {
    setTrackedRemaining(timer.remaining);
    if (timer.remaining === 0) setAnnouncement("Timer terminato");
  }

  function next() {
    setIndex((i) => Math.min(i + 1, steps.length));
  }
  function prev() {
    setIndex((i) => Math.max(i - 1, 0));
  }
  function jumpTo(stepNumber: number) {
    setIndex(Math.min(Math.max(stepNumber - 1, 0), steps.length - 1));
  }
  function handleStartTimer() {
    if (!step) return;
    timer.start();
    setAnnouncement(`Timer avviato: ${step.timerMinutes} minuti`);
  }
  function handleTogglePause() {
    const willPause = !timer.paused;
    timer.togglePause();
    setAnnouncement(willPause ? "Timer in pausa" : "Timer ripreso");
  }
  function handleCancelTimer() {
    timer.cancel();
    setAnnouncement("Timer annullato");
  }

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.target as HTMLElement | null)?.closest("input, textarea, dialog")) return;
      if (e.key === "ArrowRight") next();
      else if (e.key === "ArrowLeft") prev();
      else if (e.key === " " && step) {
        e.preventDefault();
        if (timer.remaining === null) handleStartTimer();
        else handleTogglePause();
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  });

  async function markCooked() {
    setMarking(true);
    const res = await fetch(`/api/recipes/${recipeId}/cook-log`, { method: "POST" });
    setMarking(false);
    if (await reportIfFailed(res, toast)) return;
    const log = await res.json();
    setCookLogId(log.id);
    toast.success("Ricetta segnata come cucinata.");
  }

  async function patchCookLog(patch: { rating?: number | null; notes?: string | null }) {
    if (!cookLogId) return;
    const res = await fetch(`/api/cook-logs/${cookLogId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    await reportIfFailed(res, toast);
  }

  const voice = useVoiceControl({
    next,
    prev,
    startTimer: handleStartTimer,
    repeat: () => step && speak(step.instruction),
    jump: jumpTo,
    timeLeft: () => {
      if (timer.remaining === null) speak("Nessun timer attivo");
      else speak(`Mancano ${Math.ceil(timer.remaining / 60)} minuti`);
    },
  });

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

  const minutes = timer.remaining !== null ? Math.floor(timer.remaining / 60) : null;
  const seconds = timer.remaining !== null ? timer.remaining % 60 : null;
  const progress = requiredProgress(steps, Math.min(index, steps.length - 1));

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col bg-background text-foreground"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      <p className="sr-only" aria-live="polite">
        {announcement}
      </p>

      <div className="px-4 pt-4">
        {!isDone && (
          <div className="flex gap-1 overflow-x-auto" role="group" aria-label="Vai al passaggio">
            {steps.map((s, i) => (
              <button
                key={s.id}
                type="button"
                onClick={() => jumpTo(i + 1)}
                aria-label={`Vai al passaggio ${i + 1}`}
                aria-current={i === index}
                className="flex min-h-11 min-w-11 shrink-0 items-center justify-center"
              >
                <span
                  className={`h-2 w-2 rounded-full ${
                    i === index
                      ? "bg-primary"
                      : i < index
                        ? "bg-primary/40"
                        : s.optional
                          ? "border border-muted-foreground"
                          : "bg-surface-sunken"
                  }`}
                />
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="flex items-center justify-between p-4">
        <span id="step-progress-label" className="text-sm text-muted-foreground">
          {isDone ? "Ricetta completata" : `Passaggio ${progress.current} di ${progress.total}`}
        </span>
        <div className="flex items-center gap-1">
          {ingredients.length > 0 && (
            <button
              type="button"
              onClick={() => ingredientsModalRef.current?.open()}
              aria-label="Mostra ingredienti"
              className="flex min-h-11 min-w-11 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-surface-secondary hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              <List className="h-6 w-6" aria-hidden="true" />
            </button>
          )}
          {voice.supported && (
            <button
              type="button"
              onClick={voice.toggle}
              aria-label={voice.listening ? "Disattiva comandi vocali" : "Attiva comandi vocali"}
              className={`flex min-h-11 min-w-11 items-center justify-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${voice.listening ? "bg-accent text-primary" : "text-muted-foreground hover:bg-surface-secondary hover:text-foreground"}`}
            >
              {voice.listening ? (
                <Mic className="h-6 w-6" aria-hidden="true" />
              ) : (
                <MicOff className="h-6 w-6" aria-hidden="true" />
              )}
            </button>
          )}
          <button
            type="button"
            onClick={() => router.push(`/recipes/${recipeId}`)}
            aria-label="Chiudi modalità cottura"
            className="flex min-h-11 min-w-11 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-surface-secondary hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            <X className="h-6 w-6" aria-hidden="true" />
          </button>
        </div>
      </div>

      {isDone ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-8 overflow-y-auto px-6 py-6 text-center">
          <p className="font-display text-2xl font-medium leading-snug sm:text-3xl">Ricetta completata!</p>
          {cookLogId ? (
            <div className="flex w-full max-w-sm flex-col items-center gap-4">
              <StarRating
                value={rating}
                onChange={(n) => {
                  setRating(n);
                  patchCookLog({ rating: n });
                }}
              />
              <textarea
                placeholder="Note (opzionale)"
                onBlur={(e) => patchCookLog({ notes: e.target.value || null })}
                rows={2}
                className="w-full rounded-xl border border-border bg-surface p-3 text-sm text-foreground"
              />
              <button
                type="button"
                onClick={() => router.push(`/recipes/${recipeId}`)}
                className="w-full rounded-xl border border-border bg-surface py-4 text-lg font-medium text-foreground transition-[background-color,transform] duration-200 hover:bg-surface-secondary active:scale-[0.98]"
              >
                Torna alla ricetta
              </button>
            </div>
          ) : (
            <div className="flex w-full max-w-sm flex-col gap-3">
              <button
                type="button"
                onClick={markCooked}
                disabled={marking}
                className="rounded-full bg-primary py-4 text-lg font-medium transition-[background-color,transform] duration-200 hover:bg-primary-hover active:scale-[0.98] disabled:opacity-50"
              >
                Segna come cucinata
              </button>
              <button
                type="button"
                onClick={() => router.push(`/recipes/${recipeId}`)}
                className="rounded-xl border border-border bg-surface py-4 text-lg font-medium text-foreground transition-[background-color,transform] duration-200 hover:bg-surface-secondary active:scale-[0.98]"
              >
                Torna alla ricetta
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="flex flex-1 flex-col items-center justify-center gap-6 overflow-y-auto px-6 py-6 text-center">
          {step.imageFilename && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={`/api/uploads/${step.imageFilename}`}
              alt=""
              className="max-h-48 w-full max-w-sm rounded-xl object-cover"
            />
          )}
          {step.optional && (
            <Badge variant="neutral" size="sm">
              facoltativo
            </Badge>
          )}
          <p className="font-display text-2xl font-medium leading-snug sm:text-3xl">{step.instruction}</p>
          {step.optional && (
            <button
              type="button"
              onClick={next}
              className="text-sm font-medium text-muted-foreground underline-offset-2 hover:underline"
            >
              Salta passaggio
            </button>
          )}

          {step.timerMinutes !== null && (
            <div className="flex flex-col items-center gap-3">
              {timer.remaining !== null ? (
                <>
                  <span className="text-4xl font-bold tabular-nums sm:text-5xl">
                    {String(minutes).padStart(2, "0")}:{String(seconds).padStart(2, "0")}
                  </span>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={handleTogglePause}
                      aria-label={timer.paused ? "Riprendi timer" : "Metti in pausa timer"}
                      className="flex items-center gap-1.5 rounded-full border border-border bg-surface px-4 py-2 text-sm font-medium text-foreground transition-[background-color,transform] duration-200 hover:bg-surface-secondary active:scale-[0.98]"
                    >
                      {timer.paused ? (
                        <Play className="h-4 w-4" aria-hidden="true" />
                      ) : (
                        <Pause className="h-4 w-4" aria-hidden="true" />
                      )}
                      {timer.paused ? "Riprendi" : "Pausa"}
                    </button>
                    <button
                      type="button"
                      onClick={handleCancelTimer}
                      aria-label="Annulla timer"
                      className="flex items-center gap-1.5 rounded-full border border-border bg-surface px-4 py-2 text-sm font-medium text-foreground transition-[background-color,transform] duration-200 hover:bg-surface-secondary active:scale-[0.98]"
                    >
                      <Square className="h-4 w-4" aria-hidden="true" /> Annulla
                    </button>
                  </div>
                </>
              ) : (
                <button
                  type="button"
                  onClick={handleStartTimer}
                  className="rounded-full bg-primary px-6 py-4 text-lg font-medium transition-[background-color,transform] duration-200 hover:bg-primary-hover active:scale-[0.98]"
                >
                  Avvia timer {step.timerMinutes} min
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {!isDone && (
        <div className="flex gap-3 p-4 pb-8">
          <button
            type="button"
            onClick={prev}
            disabled={index === 0}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-border bg-surface py-6 text-xl font-medium text-foreground transition-[background-color,transform] duration-200 hover:bg-surface-secondary active:scale-[0.98] disabled:opacity-30"
          >
            <ChevronLeft className="h-5 w-5" aria-hidden="true" /> Indietro
          </button>
          <button
            type="button"
            onClick={next}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-primary py-6 text-xl font-medium transition-[background-color,transform] duration-200 hover:bg-primary-hover active:scale-[0.98]"
          >
            Avanti <ChevronRight className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>
      )}

      <Modal ref={ingredientsModalRef} variant="sheet" title="Ingredienti">
        <ServingsAdjuster baseServings={baseServings} ingredients={ingredients} />
      </Modal>
    </div>
  );
}
