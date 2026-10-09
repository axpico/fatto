"use client";

import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  X,
  ChevronLeft,
  ChevronRight,
  Mic,
  MicOff,
  List,
  ListChecks,
  HelpCircle,
  Pause,
  Play,
  Square,
  BellRing,
} from "lucide-react";
import { matchVoiceCommand } from "@/lib/voiceCommands";
import { Modal, type ModalHandle } from "@/components/ui/Modal";
import { ConfirmDialog, type ConfirmDialogHandle } from "@/components/ui/ConfirmDialog";
import { ServingsAdjuster } from "@/components/ServingsAdjuster";
import { Badge } from "@/components/ui/Badge";
import { StarRating } from "@/components/ui/StarRating";
import { useToast } from "@/components/ui/Toast";
import { useCookLog } from "@/lib/useCookLog";
import { useCookSession } from "@/lib/useCookSession";
import { clearCheckedIngredients } from "@/lib/useCheckedIngredients";
import { UploadedImage } from "@/components/UploadedImage";
import { buttonClasses, pressableTransition } from "@/components/ui/Button";

// ssr:false must be called from a client component — this file is one.
const CookAmbientScene = dynamic(
  () => import("@/components/motion/CookAmbientScene").then((m) => m.CookAmbientScene),
  { ssr: false },
);

type Step = {
  id: string;
  instruction: string;
  timerMinutes: number | null;
  optional: boolean;
  imageFilename: string | null;
};
const NOTES_AUTOSAVE_MS = 800;
const NOT_UNDERSTOOD_MS = 2000;
const RING_INTERVAL_MS = 3000;

type Ingredient = { id: string; name: string; quantity: number | null; unit: string | null; optional: boolean };

const VOICE_COMMANDS_HELP: { phrase: string; description: string }[] = [
  { phrase: '"Avanti" / "Prossimo"', description: "Passaggio successivo" },
  { phrase: '"Indietro" / "Precedente"', description: "Passaggio precedente" },
  { phrase: '"Passaggio [numero]"', description: "Vai a un passaggio specifico" },
  { phrase: '"Ripeti"', description: "Rileggi il passaggio corrente" },
  { phrase: '"Avvia timer"', description: "Avvia il timer del passaggio" },
  { phrase: '"Pausa"', description: "Metti in pausa o riprendi il timer" },
  { phrase: '"Annulla timer" / "Ferma timer"', description: "Annulla il timer" },
  { phrase: '"Quanto manca"', description: "Tempo rimasto sul timer" },
];

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
  onerror: ((event: { error: string }) => void) | null;
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
  pauseTimer: () => void;
  cancelTimer: () => void;
  repeat: () => void;
  jump: (step: number) => void;
  timeLeft: () => void;
}, onUnavailable: () => void) {
  const [supported] = useState(() => getSpeechRecognitionCtor() !== null);
  const [listening, setListening] = useState(false);
  const [notUnderstood, setNotUnderstood] = useState(false);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  // the user's intent, separate from the engine state: Chrome ends continuous recognition on its
  // own after a stretch of silence, and we restart it as long as the user hasn't turned it off
  const wantListeningRef = useRef(false);
  const notUnderstoodTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const actionsRef = useRef(actions);
  const onUnavailableRef = useRef(onUnavailable);

  useEffect(() => {
    actionsRef.current = actions;
    onUnavailableRef.current = onUnavailable;
  });

  useEffect(() => {
    return () => {
      wantListeningRef.current = false;
      recognitionRef.current?.stop();
      if (notUnderstoodTimerRef.current) clearTimeout(notUnderstoodTimerRef.current);
    };
  }, []);

  function flagNotUnderstood() {
    setNotUnderstood(true);
    if (notUnderstoodTimerRef.current) clearTimeout(notUnderstoodTimerRef.current);
    notUnderstoodTimerRef.current = setTimeout(() => setNotUnderstood(false), NOT_UNDERSTOOD_MS);
  }

  function toggle() {
    if (listening) {
      wantListeningRef.current = false;
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
      if (!command) {
        flagNotUnderstood();
        return;
      }
      setNotUnderstood(false);
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
        case "pauseTimer":
          actionsRef.current.pauseTimer();
          break;
        case "cancelTimer":
          actionsRef.current.cancelTimer();
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
    recognition.onerror = (event) => {
      // permission denied / no mic: stop, or onend would restart (and fail) in a loop
      if (["not-allowed", "service-not-allowed", "audio-capture"].includes(event.error)) {
        wantListeningRef.current = false;
        onUnavailableRef.current();
      }
    };
    recognition.onend = () => {
      if (!wantListeningRef.current) {
        setListening(false);
        return;
      }
      try {
        recognition.start();
      } catch {
        wantListeningRef.current = false;
        setListening(false);
      }
    };
    wantListeningRef.current = true;
    recognition.start();
    recognitionRef.current = recognition;
    setListening(true);
  }

  return { supported, listening, notUnderstood, toggle };
}

// Android Chrome forbids `new Notification()` (TypeError "Illegal constructor"): pages must go
// through the service worker registration. Never throws: a missing notification must not take
// down cook mode mid-timer.
function showSystemNotification(title: string, options: NotificationOptions) {
  try {
    if (!("Notification" in window) || Notification.permission !== "granted") return;
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.ready
        .then((registration) => registration.showNotification(title, options))
        .catch(() => {});
      return;
    }
    new Notification(title, options);
  } catch {
    // unsupported here: the in-page banner and beep still fire
  }
}

// one context for the page's lifetime: browsers (iOS Safari especially) cap how many can be open,
// and the repeating timer alarm would otherwise create a new one every few seconds
let beepContext: AudioContext | null = null;

function playBeep() {
  const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  beepContext ??= new Ctx();
  const ctx = beepContext;
  if (ctx.state === "suspended") ctx.resume().catch(() => {});
  const oscillator = ctx.createOscillator();
  const gain = ctx.createGain();
  oscillator.frequency.value = 880;
  gain.gain.setValueAtTime(0.3, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6);
  oscillator.connect(gain).connect(ctx.destination);
  oscillator.start();
  oscillator.stop(ctx.currentTime + 0.6);
}

function useWakeLock(onUnavailable?: () => void) {
  useEffect(() => {
    let lock: WakeLockSentinel | null = null;
    let notified = false;

    function notifyOnce() {
      if (notified) return;
      notified = true;
      onUnavailable?.();
    }

    async function acquire() {
      // the lock is released automatically when the page is hidden, and requesting it while
      // hidden always fails: only (re)acquire on the way back to visible
      if (document.visibilityState !== "visible") return;
      if (!("wakeLock" in navigator)) {
        notifyOnce();
        return;
      }
      try {
        lock = await navigator.wakeLock.request("screen");
      } catch {
        // wake lock negato/non disponibile: segnaliamo una volta sola, la cottura funziona comunque
        notifyOnce();
      }
    }

    acquire();
    document.addEventListener("visibilitychange", acquire);

    return () => {
      document.removeEventListener("visibilitychange", acquire);
      lock?.release().catch(() => {});
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- onUnavailable è una callback one-shot catturata al mount
  }, []);
}

type CookTimerEntry = {
  endAt: number | null;
  remainingAtPause: number | null;
  totalSeconds: number;
};
type CookTimersState = Record<number, CookTimerEntry>;

function remainingOf(entry: CookTimerEntry | undefined, now: number): number | null {
  if (!entry) return null;
  if (entry.endAt !== null) return Math.max(0, Math.round((entry.endAt - now) / 1000));
  return entry.remainingAtPause;
}

// Timer multipli, uno per passaggio: sopravvivono alla navigazione tra passaggi (a differenza del
// vecchio timer singolo legato al passaggio corrente). Basati su un endAt (timestamp assoluto), non
// su un countdown decrementato ogni secondo, così restano corretti anche dopo che l'app è stata in
// background (dove i timer JS vengono sospesi/rallentati dal browser) — e quindi anche dopo un
// ripristino di sessione da localStorage.
function useCookTimers(initial: CookTimersState, onFinish: (stepIndex: number) => void) {
  const [timers, setTimers] = useState<CookTimersState>(initial);
  const [now, setNow] = useState(() => Date.now());
  const firedRef = useRef<Set<number>>(new Set());
  const onFinishRef = useRef(onFinish);
  useEffect(() => {
    onFinishRef.current = onFinish;
  });

  const hasRunning = Object.values(timers).some((t) => t.endAt !== null && t.endAt > now);
  useEffect(() => {
    if (!hasRunning) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [hasRunning]);

  useEffect(() => {
    for (const [key, entry] of Object.entries(timers)) {
      const stepIndex = Number(key);
      const remaining = remainingOf(entry, now);
      if (remaining === 0 && entry.endAt !== null && !firedRef.current.has(stepIndex)) {
        firedRef.current.add(stepIndex);
        playBeep();
        navigator.vibrate?.(500);
        onFinishRef.current(stepIndex);
      }
    }
  }, [now, timers]);

  function start(stepIndex: number, minutes: number) {
    firedRef.current.delete(stepIndex);
    setTimers((t) => ({
      ...t,
      [stepIndex]: { endAt: Date.now() + minutes * 60_000, remainingAtPause: null, totalSeconds: minutes * 60 },
    }));
  }

  function togglePause(stepIndex: number) {
    setTimers((t) => {
      const entry = t[stepIndex];
      if (!entry) return t;
      if (entry.endAt !== null) {
        return { ...t, [stepIndex]: { ...entry, endAt: null, remainingAtPause: remainingOf(entry, Date.now()) } };
      }
      if (entry.remainingAtPause !== null) {
        return {
          ...t,
          [stepIndex]: { ...entry, endAt: Date.now() + entry.remainingAtPause * 1000, remainingAtPause: null },
        };
      }
      return t;
    });
  }

  function cancel(stepIndex: number) {
    firedRef.current.delete(stepIndex);
    setTimers((t) => {
      const next = { ...t };
      delete next[stepIndex];
      return next;
    });
  }

  function remainingFor(stepIndex: number): number | null {
    return remainingOf(timers[stepIndex], now);
  }

  function isPaused(stepIndex: number): boolean {
    const entry = timers[stepIndex];
    return !!entry && entry.endAt === null && entry.remainingAtPause !== null;
  }

  const active = Object.entries(timers)
    .map(([key, entry]) => ({
      stepIndex: Number(key),
      remaining: remainingOf(entry, now) ?? 0,
      paused: entry.endAt === null,
    }))
    .sort((a, b) => a.stepIndex - b.stepIndex);

  return { timers, active, start, togglePause, cancel, remainingFor, isPaused };
}

type CookSessionData = { index: number; timers: CookTimersState };

const stepVariants = {
  enter: (dir: 1 | -1) => ({ opacity: 0, x: dir * 24 }),
  center: { opacity: 1, x: 0 },
  exit: (dir: 1 | -1) => ({ opacity: 0, x: dir * -24 }),
};

export function CookingModeViewer({
  recipeId,
  title,
  steps,
  ingredients,
  baseServings,
}: {
  recipeId: string;
  title: string;
  steps: Step[];
  ingredients: Ingredient[];
  baseServings: number;
}) {
  const router = useRouter();
  const toast = useToast();
  const cookLog = useCookLog(recipeId);
  const reduceMotion = useReducedMotion();
  const session = useCookSession<CookSessionData>(recipeId);
  const [index, setIndex] = useState(() => session.restored?.index ?? 0);
  const [announcement, setAnnouncement] = useState("");
  const [trackedIndex, setTrackedIndex] = useState(() => session.restored?.index ?? 0);
  const [marking, setMarking] = useState(false);
  const [cookLogId, setCookLogId] = useState<string | null>(null);
  const [rating, setRating] = useState<number | null>(null);
  const [logSaved, setLogSaved] = useState(false);
  const notesTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [dragX, setDragX] = useState(0);
  const touchStartX = useRef<number | null>(null);
  const [direction, setDirection] = useState<1 | -1>(1);
  const ingredientsModalRef = useRef<ModalHandle>(null);
  const stepsModalRef = useRef<ModalHandle>(null);
  const voiceHelpModalRef = useRef<ModalHandle>(null);
  const exitDialogRef = useRef<ConfirmDialogHandle>(null);

  useWakeLock(() => toast.error("Lo schermo potrebbe spegnersi automaticamente durante la cottura."));

  const step = steps[index];
  const isDone = index === steps.length;

  // finished timers keep beeping (and stay in the banner) until acknowledged
  const [ringing, setRinging] = useState<number[]>([]);
  function handleTimerFinish(stepIndex: number) {
    setAnnouncement(stepIndex === index ? "Timer terminato" : `Timer del passaggio ${stepIndex + 1} terminato`);
    setRinging((r) => (r.includes(stepIndex) ? r : [...r, stepIndex]));
    if (document.visibilityState !== "visible") {
      showSystemNotification(`Timer passaggio ${stepIndex + 1} terminato`, { body: title, tag: `timer-${recipeId}-${stepIndex}` });
    }
  }
  function acknowledge(stepIndex: number) {
    setRinging((r) => r.filter((i) => i !== stepIndex));
  }
  useEffect(() => {
    if (ringing.length === 0) return;
    const id = setInterval(() => {
      playBeep();
      navigator.vibrate?.(300);
    }, RING_INTERVAL_MS);
    return () => clearInterval(id);
  }, [ringing.length]);
  const cookTimers = useCookTimers(session.restored?.timers ?? {}, handleTimerFinish);
  const remaining = cookTimers.remainingFor(index);
  const timerPaused = cookTimers.isPaused(index);

  // annuncio discreto di cambio passaggio, calcolato durante il render (non in un effect) per
  // evitare il pattern "setState sincrono dentro un effect" — il timer segue la stessa logica
  // dentro useCookTimers (vedi onFinish sopra)
  if (index !== trackedIndex) {
    setTrackedIndex(index);
    const p = requiredProgress(steps, Math.min(index, steps.length - 1));
    setAnnouncement(isDone ? "Ricetta completata" : `Passaggio ${p.current} di ${p.total}`);
  }

  // sessione salvata per ricetta (passaggio corrente + timer), cancellata solo all'uscita esplicita
  // (bottone chiudi, "Torna alla ricetta", o al termine della cottura) — così sopravvive a
  // ricarica/passaggio in background ma non resta appesa dopo che l'hai davvero finita
  useEffect(() => {
    session.save({ index, timers: cookTimers.timers });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- session.save ha lo stesso comportamento ad ogni render, non serve nelle deps
  }, [index, cookTimers.timers]);

  function next() {
    setDirection(1);
    setIndex((i) => Math.min(i + 1, steps.length));
  }
  function prev() {
    setDirection(-1);
    setIndex((i) => Math.max(i - 1, 0));
  }
  function jumpTo(stepNumber: number) {
    const target = Math.min(Math.max(stepNumber - 1, 0), steps.length - 1);
    setDirection(target >= index ? 1 : -1);
    setIndex(target);
  }
  function handleStartTimer() {
    if (!step || step.timerMinutes === null) return;
    cookTimers.start(index, step.timerMinutes);
    acknowledge(index);
    // asked once, on the first timer: the moment the user can see why it's useful
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission().catch(() => {});
    }
    setAnnouncement(`Timer avviato: ${step.timerMinutes} minuti`);
  }
  function handleTogglePause() {
    const willPause = !timerPaused;
    cookTimers.togglePause(index);
    setAnnouncement(willPause ? "Timer in pausa" : "Timer ripreso");
  }
  function handleCancelTimer() {
    cookTimers.cancel(index);
    acknowledge(index);
    setAnnouncement("Timer annullato");
  }

  async function handleExit() {
    if (index > 0 || cookTimers.active.length > 0) {
      const confirmed = await exitDialogRef.current?.open();
      if (!confirmed) return;
    }
    exitNow();
  }

  function exitNow() {
    session.clear();
    clearCheckedIngredients(recipeId);
    router.push(`/recipes/${recipeId}`);
  }

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      // Space/arrows on a focused control must keep their native meaning (press the button)
      if ((e.target as HTMLElement | null)?.closest("input, textarea, select, button, a, dialog")) return;
      if (e.key === "ArrowRight") next();
      else if (e.key === "ArrowLeft") prev();
      else if (e.key === " " && step) {
        e.preventDefault();
        if (remaining === null) handleStartTimer();
        else handleTogglePause();
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  });

  async function markCooked() {
    setMarking(true);
    const log = await cookLog.markCooked<{ id: string }>();
    setMarking(false);
    if (!log) return;
    setCookLogId(log.id);
    session.clear();
    clearCheckedIngredients(recipeId);
    toast.success("Ricetta segnata come cucinata.");
  }

  async function patchCookLog(patch: { rating?: number | null; notes?: string | null }) {
    if (!cookLogId) return;
    const ok = await cookLog.patchCookLog(cookLogId, patch);
    // inline "Salvato" instead of a toast: every star tap / pause in typing would stack one
    if (ok) setLogSaved(true);
  }

  // notes autosave while typing (blur alone can be lost on mobile navigation)
  function handleNotesChange(notes: string) {
    setLogSaved(false);
    if (notesTimerRef.current) clearTimeout(notesTimerRef.current);
    notesTimerRef.current = setTimeout(() => patchCookLog({ notes: notes || null }), NOTES_AUTOSAVE_MS);
  }

  function flushNotes(notes: string) {
    if (notesTimerRef.current) clearTimeout(notesTimerRef.current);
    notesTimerRef.current = null;
    patchCookLog({ notes: notes || null });
  }

  const voice = useVoiceControl({
    next,
    prev,
    startTimer: handleStartTimer,
    pauseTimer: handleTogglePause,
    cancelTimer: handleCancelTimer,
    repeat: () => step && speak(step.instruction),
    jump: jumpTo,
    timeLeft: () => {
      if (remaining === null) speak("Nessun timer attivo");
      else speak(`Mancano ${Math.ceil(remaining / 60)} minuti`);
    },
  }, () => toast.error("Microfono non disponibile: controlla i permessi del browser."));

  function handleTouchStart(e: React.TouchEvent) {
    touchStartX.current = e.touches[0].clientX;
  }
  function handleTouchMove(e: React.TouchEvent) {
    if (touchStartX.current === null || reduceMotion) return;
    setDragX(e.touches[0].clientX - touchStartX.current);
  }
  function handleTouchEnd(e: React.TouchEvent) {
    if (touchStartX.current === null) return;
    const delta = e.changedTouches[0].clientX - touchStartX.current;
    if (Math.abs(delta) > 50) {
      if (delta < 0) next();
      else prev();
    }
    touchStartX.current = null;
    setDragX(0);
  }

  const minutes = remaining !== null ? Math.floor(remaining / 60) : null;
  const seconds = remaining !== null ? remaining % 60 : null;
  const progress = requiredProgress(steps, Math.min(index, steps.length - 1));
  const otherActiveTimers = cookTimers.active.filter((t) => t.stepIndex !== index);

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col bg-background text-foreground"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      <div className="pointer-events-none absolute inset-0 z-0">
        <CookAmbientScene />
      </div>

      <p className="sr-only" aria-live="polite">
        {announcement}
      </p>

      <div className="relative z-10 px-4 pt-4">
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
                  className={`h-2 w-2 rounded-full transition-[background-color,transform] duration-300 ${
                    i === index
                      ? "scale-125 bg-primary"
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

      {ringing.length > 0 && (
        <div className="relative z-10 space-y-2 px-4 pt-2" role="alert">
          {ringing.map((stepIndex) => (
            <div
              key={stepIndex}
              className="flex items-center gap-2 rounded-xl border border-primary bg-accent px-4 py-3 shadow-md"
            >
              <BellRing className="h-5 w-5 shrink-0 animate-pulse text-primary" aria-hidden="true" />
              <span className="flex-1 text-sm font-medium">Timer passaggio {stepIndex + 1} terminato</span>
              {stepIndex !== index && (
                <button
                  type="button"
                  onClick={() => {
                    acknowledge(stepIndex);
                    jumpTo(stepIndex + 1);
                  }}
                  className="min-h-11 rounded-full px-3 text-sm font-medium text-primary hover:bg-surface"
                >
                  Vai
                </button>
              )}
              <button
                type="button"
                onClick={() => acknowledge(stepIndex)}
                className="min-h-11 rounded-full bg-primary px-4 text-sm font-medium text-primary-foreground"
              >
                OK
              </button>
            </div>
          ))}
        </div>
      )}

      {voice.notUnderstood && (
        <p className="relative z-10 px-4 pt-2 text-center text-sm text-muted-foreground" aria-live="polite">
          Non ho capito: tocca <HelpCircle className="inline h-3.5 w-3.5" aria-hidden="true" /> per i comandi
        </p>
      )}

      {otherActiveTimers.length > 0 && (
        <div className="relative z-10 flex gap-2 overflow-x-auto px-4 pt-2" role="group" aria-label="Timer attivi">
          {otherActiveTimers.map((t) => (
            <button
              key={t.stepIndex}
              type="button"
              onClick={() => jumpTo(t.stepIndex + 1)}
              className="flex shrink-0 items-center gap-1.5 rounded-full border border-border bg-surface px-3 py-1.5 text-xs font-medium shadow-sm hover:bg-surface-secondary"
            >
              <span className="text-muted-foreground">Passaggio {t.stepIndex + 1}</span>
              <span className="tabular-nums text-foreground">
                {t.paused ? "· " : ""}
                {String(Math.floor(t.remaining / 60)).padStart(2, "0")}:{String(t.remaining % 60).padStart(2, "0")}
              </span>
            </button>
          ))}
        </div>
      )}

      <div className="relative z-10 flex items-center justify-between gap-2 p-4">
        <div className="flex min-w-0 flex-col">
          <span className="truncate text-xs text-muted-foreground/70">{title}</span>
          <span id="step-progress-label" className="text-sm text-muted-foreground">
            {isDone ? "Ricetta completata" : `Passaggio ${progress.current} di ${progress.total}`}
          </span>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          {ingredients.length > 0 && (
            <button
              type="button"
              onClick={() => ingredientsModalRef.current?.open()}
              aria-label="Mostra ingredienti"
              className={buttonClasses("ghost", "icon")}
            >
              <List className="h-6 w-6" aria-hidden="true" />
            </button>
          )}
          <button
            type="button"
            onClick={() => stepsModalRef.current?.open()}
            aria-label="Tutti i passaggi"
            className={buttonClasses("ghost", "icon")}
          >
            <ListChecks className="h-6 w-6" aria-hidden="true" />
          </button>
          {voice.supported && (
            <>
              <button
                type="button"
                onClick={voice.toggle}
                aria-label={voice.listening ? "Disattiva comandi vocali" : "Attiva comandi vocali"}
                className={`relative flex min-h-11 min-w-11 items-center justify-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${voice.listening ? "bg-accent text-primary" : "text-muted-foreground hover:bg-surface-secondary hover:text-foreground"}`}
              >
                {voice.listening && (
                  <span className="absolute inset-0 animate-ping rounded-full bg-primary/30" aria-hidden="true" />
                )}
                {voice.listening ? (
                  <Mic className="relative h-6 w-6" aria-hidden="true" />
                ) : (
                  <MicOff className="h-6 w-6" aria-hidden="true" />
                )}
              </button>
              <button
                type="button"
                onClick={() => voiceHelpModalRef.current?.open()}
                aria-label="Comandi vocali disponibili"
                className={buttonClasses("ghost", "icon")}
              >
                <HelpCircle className="h-6 w-6" aria-hidden="true" />
              </button>
            </>
          )}
          <button
            type="button"
            onClick={handleExit}
            aria-label="Chiudi modalità cottura"
            className={buttonClasses("ghost", "icon")}
          >
            <X className="h-6 w-6" aria-hidden="true" />
          </button>
        </div>
      </div>

      <AnimatePresence mode="wait" initial={false} custom={direction}>
      <motion.div
        key={isDone ? "done" : step.id}
        custom={direction}
        variants={stepVariants}
        initial={reduceMotion ? false : "enter"}
        animate="center"
        exit={reduceMotion ? undefined : "exit"}
        transition={{ duration: reduceMotion ? 0 : 0.2, ease: "easeOut" }}
        className="flex flex-1 flex-col"
      >
      {isDone ? (
        <div className="relative z-10 flex flex-1 flex-col items-center justify-center gap-8 overflow-y-auto px-6 py-6 text-center">
          <p className="font-display text-2xl font-medium leading-snug sm:text-3xl">Ricetta completata!</p>
          {cookLogId ? (
            <div className="flex w-full max-w-sm flex-col items-center gap-4">
              <StarRating
                value={rating}
                onChange={(n) => {
                  setRating(n);
                  setLogSaved(false);
                  patchCookLog({ rating: n });
                }}
              />
              <p aria-live="polite" className="h-4 text-xs text-muted-foreground">
                {logSaved ? "Salvato" : ""}
              </p>
              <textarea
                placeholder="Note (opzionale)"
                aria-label="Note"
                onChange={(e) => handleNotesChange(e.target.value)}
                onBlur={(e) => flushNotes(e.target.value)}
                rows={2}
                className="w-full rounded-xl border border-border bg-surface p-3 text-sm text-foreground"
              />
              <button
                type="button"
                onClick={exitNow}
                className={`w-full rounded-xl border border-border bg-surface py-4 text-lg font-medium text-foreground ${pressableTransition} hover:bg-surface-secondary`}
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
                className={`rounded-xl bg-primary py-4 text-lg font-medium text-primary-foreground ${pressableTransition} hover:bg-primary-hover disabled:opacity-50`}
              >
                Segna come cucinata
              </button>
              <button
                type="button"
                onClick={exitNow}
                className={`rounded-xl border border-border bg-surface py-4 text-lg font-medium text-foreground ${pressableTransition} hover:bg-surface-secondary`}
              >
                Torna alla ricetta
              </button>
            </div>
          )}
        </div>
      ) : (
        <div
          className="relative z-10 flex flex-1 flex-col items-center justify-center gap-6 overflow-y-auto px-6 py-6 text-center"
          style={
            dragX !== 0
              ? { transform: `translateX(${dragX * 0.4}px)` }
              : { transform: "translateX(0)", transition: "transform 150ms ease-out" }
          }
        >
          {step.imageFilename && (
            <UploadedImage
              filename={step.imageFilename}
              alt=""
              className="max-h-48 w-full max-w-sm rounded-xl object-cover"
            />
          )}
          {step.optional && (
            <div className="flex items-center gap-2">
              <Badge variant="neutral" size="sm">
                facoltativo
              </Badge>
              <button
                type="button"
                onClick={next}
                className="min-h-11 rounded-full px-3 text-sm font-medium text-muted-foreground underline hover:text-foreground"
              >
                Salta
              </button>
            </div>
          )}
          <p className="font-display text-2xl font-medium leading-snug sm:text-3xl">{step.instruction}</p>

          {step.timerMinutes !== null && (
            <div className="flex flex-col items-center gap-3">
              {remaining !== null ? (
                <>
                  <span
                    className={`text-4xl font-bold tabular-nums sm:text-5xl ${
                      remaining !== null && remaining <= 10 ? "text-destructive animate-pulse" : ""
                    }`}
                  >
                    {String(minutes).padStart(2, "0")}:{String(seconds).padStart(2, "0")}
                  </span>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={handleTogglePause}
                      aria-label={timerPaused ? "Riprendi timer" : "Metti in pausa timer"}
                      className={`flex items-center gap-1.5 rounded-full border border-border bg-surface px-4 py-2 text-sm font-medium text-foreground ${pressableTransition} hover:bg-surface-secondary`}
                    >
                      {timerPaused ? (
                        <Play className="h-4 w-4" aria-hidden="true" />
                      ) : (
                        <Pause className="h-4 w-4" aria-hidden="true" />
                      )}
                      {timerPaused ? "Riprendi" : "Pausa"}
                    </button>
                    <button
                      type="button"
                      onClick={handleCancelTimer}
                      aria-label="Annulla timer"
                      className={`flex items-center gap-1.5 rounded-full border border-border bg-surface px-4 py-2 text-sm font-medium text-foreground ${pressableTransition} hover:bg-surface-secondary`}
                    >
                      <Square className="h-4 w-4" aria-hidden="true" /> Annulla
                    </button>
                  </div>
                </>
              ) : (
                <button
                  type="button"
                  onClick={handleStartTimer}
                  className={`rounded-xl bg-primary px-6 py-4 text-lg font-medium text-primary-foreground ${pressableTransition} hover:bg-primary-hover`}
                >
                  Avvia timer {step.timerMinutes} min
                </button>
              )}
            </div>
          )}
        </div>
      )}
      </motion.div>
      </AnimatePresence>

      {!isDone && (
        <div className="relative z-10 flex gap-3 p-4 pb-[calc(2rem+env(safe-area-inset-bottom))]">
          <button
            type="button"
            onClick={prev}
            disabled={index === 0}
            className={`flex flex-1 items-center justify-center gap-2 rounded-xl border border-border bg-surface py-6 text-xl font-medium text-foreground ${pressableTransition} hover:bg-surface-secondary disabled:opacity-30`}
          >
            <ChevronLeft className="h-5 w-5" aria-hidden="true" /> Indietro
          </button>
          <button
            type="button"
            onClick={next}
            className={`flex flex-1 items-center justify-center gap-2 rounded-xl bg-primary py-6 text-xl font-medium text-primary-foreground ${pressableTransition} hover:bg-primary-hover`}
          >
            Avanti <ChevronRight className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>
      )}

      <Modal ref={ingredientsModalRef} variant="sheet" title="Ingredienti">
        <ServingsAdjuster recipeId={recipeId} baseServings={baseServings} ingredients={ingredients} />
      </Modal>

      <Modal ref={stepsModalRef} variant="sheet" title="Tutti i passaggi">
        <ol className="space-y-1">
          {steps.map((s, i) => (
            <li key={s.id}>
              <button
                type="button"
                onClick={() => {
                  jumpTo(i + 1);
                  stepsModalRef.current?.close();
                }}
                className={`flex w-full items-start gap-3 rounded-lg px-3 py-2.5 text-left transition-colors hover:bg-surface-secondary ${i === index ? "bg-accent" : ""}`}
              >
                <span
                  className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${
                    i === index
                      ? "bg-primary text-primary-foreground"
                      : i < index
                        ? "bg-primary/20 text-primary"
                        : "bg-surface-sunken text-muted-foreground"
                  }`}
                >
                  {i + 1}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="line-clamp-2 text-sm text-foreground">{s.instruction}</span>
                  {s.optional && (
                    <Badge variant="neutral" size="sm" className="mt-1">
                      facoltativo
                    </Badge>
                  )}
                </span>
              </button>
            </li>
          ))}
        </ol>
      </Modal>

      <Modal ref={voiceHelpModalRef} variant="sheet" title="Comandi vocali">
        <ul className="space-y-3">
          {VOICE_COMMANDS_HELP.map((c) => (
            <li
              key={c.phrase}
              className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5 border-b border-border/60 pb-3 last:border-0 last:pb-0"
            >
              <span className="font-medium text-foreground">{c.phrase}</span>
              <span className="text-sm text-muted-foreground">{c.description}</span>
            </li>
          ))}
        </ul>
      </Modal>

      <ConfirmDialog
        ref={exitDialogRef}
        title="Interrompere la cottura?"
        description={
          cookTimers.active.length > 0
            ? "Il passaggio raggiunto e i timer in corso andranno persi."
            : "Il passaggio raggiunto andrà perso."
        }
        confirmLabel="Esci"
      />
    </div>
  );
}
