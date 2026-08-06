"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Clock, Dices } from "lucide-react";
import { type RecipeCardData } from "@/components/RecipeCard";
import { UploadedImage } from "@/components/UploadedImage";
import { FavoriteButton } from "@/components/FavoriteButton";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { Spinner } from "@/components/ui/Spinner";
import { SectionIntro } from "@/components/ui/SectionIntro";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import { loadJson } from "@/lib/apiError";

// ssr:false must be called from a client component — this file is one.
const CookedCelebration = dynamic(
  () => import("@/components/motion/CookedCelebration").then((m) => m.CookedCelebration),
  { ssr: false },
);

const MAX_SEGMENTS = 8;
const SLICE_COLORS = [
  "var(--primary)",
  "var(--success)",
  "var(--warning)",
  "var(--destructive)",
  "color-mix(in oklab, var(--primary) 60%, var(--accent))",
  "color-mix(in oklab, var(--success) 60%, var(--accent))",
  "color-mix(in oklab, var(--warning) 60%, var(--accent))",
  "color-mix(in oklab, var(--destructive) 60%, var(--accent))",
];
const SIZE = 380;
const CENTER = SIZE / 2;
const RADIUS = 178;
const MIN_DELAY_MS = 55;
const MAX_EXTRA_DELAY_MS = 380;

function slicePath(startDeg: number, endDeg: number): string {
  const [x1, y1] = polarToXY(startDeg);
  const [x2, y2] = polarToXY(endDeg);
  const large = endDeg - startDeg > 180 ? 1 : 0;
  return `M ${CENTER} ${CENTER} L ${x1} ${y1} A ${RADIUS} ${RADIUS} 0 ${large} 1 ${x2} ${y2} Z`;
}

function polarToXY(angleDeg: number): [number, number] {
  const a = ((angleDeg - 90) * Math.PI) / 180;
  return [CENTER + RADIUS * Math.cos(a), CENTER + RADIUS * Math.sin(a)];
}

function truncate(title: string, max = 18): string {
  return title.length > max ? `${title.slice(0, max - 1)}…` : title;
}

function pickSegments(pool: RecipeCardData[]): { segments: RecipeCardData[]; winnerIdx: number } {
  const n = Math.min(MAX_SEGMENTS, pool.length);
  const segments = [...pool].sort(() => Math.random() - 0.5).slice(0, n);
  const winnerIdx = Math.floor(Math.random() * n);
  return { segments, winnerIdx };
}

function recipeMeta(recipe: RecipeCardData): { totalTime: number; tags: string[] } {
  const totalTime = (recipe.prepTimeMinutes ?? 0) + (recipe.cookTimeMinutes ?? 0);
  return { totalTime, tags: recipe.tags.slice(0, 3).map((t) => t.name) };
}

export function WheelSpinner() {
  const router = useRouter();
  const toast = useToast();
  const reducedMotion = useReducedMotion();

  const [pool, setPool] = useState<RecipeCardData[] | null>(null);
  const [segments, setSegments] = useState<RecipeCardData[]>([]);
  const [winner, setWinner] = useState<RecipeCardData | null>(null);
  const [highlightIdx, setHighlightIdx] = useState(-1);
  const [spinning, setSpinning] = useState(false);
  const [celebrating, setCelebrating] = useState(false);
  const spinningRef = useRef(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    loadJson<RecipeCardData[]>("/api/recipes", toast, (data) => {
      setPool(data);
      if (data.length > 0) setSegments(pickSegments(data).segments);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- fetch once per mount, toast identity is stable
  }, []);

  useEffect(() => () => clearTimeout(timeoutRef.current ?? undefined), []);

  function spin() {
    if (!pool || pool.length === 0 || spinningRef.current) return;
    const { segments: nextSegments, winnerIdx: nextWinnerIdx } = pickSegments(pool);
    const n = nextSegments.length;
    const loops = reducedMotion ? 1 : 3 + Math.floor(Math.random() * 3);
    // La luce si ferma sull'indice (step % n): con step finale = loops*n + nextWinnerIdx,
    // quel resto è per costruzione nextWinnerIdx — nessuna geometria/angolo da far coincidere.
    const finalStep = loops * n + nextWinnerIdx;

    setSegments(nextSegments);
    setWinner(null);
    setSpinning(true);
    spinningRef.current = true;

    let step = 0;
    const tick = () => {
      setHighlightIdx(step % n);
      if (step >= finalStep) {
        setSpinning(false);
        spinningRef.current = false;
        setWinner(nextSegments[nextWinnerIdx]);
        setCelebrating(true);
        return;
      }
      step += 1;
      const progress = step / finalStep;
      const delay = MIN_DELAY_MS + progress * progress * MAX_EXTRA_DELAY_MS;
      timeoutRef.current = setTimeout(tick, delay);
    };
    tick();
  }

  const litColor = highlightIdx >= 0 ? SLICE_COLORS[highlightIdx % SLICE_COLORS.length] : "var(--primary)";
  const { totalTime, tags } = winner ? recipeMeta(winner) : { totalTime: 0, tags: [] as string[] };

  return (
    <div className="page-shell max-w-md space-y-6">
      <Card className="relative space-y-5 overflow-hidden p-4 sm:p-5">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -inset-x-10 -top-28 h-72 rounded-full blur-3xl"
          style={{
            background:
              "radial-gradient(circle, color-mix(in oklab, var(--primary) 22%, transparent), transparent 70%)",
          }}
        />

        <div className="relative space-y-5">
          <SectionIntro
            icon={Dices}
            title="Ruota della fortuna"
            description="Gira e lascia che sia il caso a decidere cosa cucinare stasera."
          />

          {pool === null && (
            <div className="flex justify-center py-10">
              <Spinner className="h-8 w-8 text-muted-foreground" />
            </div>
          )}

          {pool !== null && pool.length === 0 && (
            <EmptyState title="Nessuna ricetta" description="Aggiungi qualche ricetta prima di far girare la ruota." />
          )}

          {pool !== null && pool.length > 0 && (
            <div className="space-y-4">
              <div className="relative mx-auto aspect-square w-full max-w-[380px]">
                <AnimatePresence mode="wait">
                  {winner ? (
                    <motion.div
                      key="result"
                      initial={{ opacity: 0, scale: 0.96 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.96 }}
                      transition={{ duration: 0.25 }}
                      className="absolute inset-0 overflow-hidden rounded-2xl bg-surface-secondary shadow-[var(--shadow-md)] ring-4 ring-border-strong/60"
                    >
                      {winner.photoUrl ? (
                        <UploadedImage
                          filename={winner.photoUrl}
                          alt={winner.title}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-muted-foreground">
                          <Dices className="h-12 w-12" aria-hidden="true" />
                        </div>
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/15 to-transparent" />
                      <FavoriteButton
                        recipeId={winner.id}
                        initialFavorite={winner.favorite}
                        className="absolute right-3 top-3 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-black/30 text-white backdrop-blur-sm transition-colors hover:bg-black/50"
                      />
                      <div className="absolute inset-x-0 bottom-0 p-4">
                        <p className="font-display text-2xl font-semibold text-white drop-shadow-sm">
                          {winner.title}
                        </p>
                        {(totalTime > 0 || tags.length > 0) && (
                          <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-white/80">
                            {totalTime > 0 && (
                              <span className="inline-flex items-center gap-1">
                                <Clock className="h-3.5 w-3.5" aria-hidden="true" /> {totalTime} min
                              </span>
                            )}
                            {tags.map((t) => (
                              <span key={t}>#{t}</span>
                            ))}
                          </div>
                        )}
                      </div>
                    </motion.div>
                  ) : (
                    <motion.div
                      key="wheel"
                      initial={{ opacity: 0, scale: 0.96 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.96 }}
                      transition={{ duration: 0.25 }}
                      className="absolute inset-0"
                    >
                      <div className="absolute inset-0 rounded-full bg-surface-secondary shadow-[var(--shadow-md)] ring-4 ring-border-strong/60" />

                      <svg
                        viewBox={`0 0 ${SIZE} ${SIZE}`}
                        className="absolute inset-0 h-full w-full p-2 [filter:drop-shadow(0_2px_6px_rgb(0_0_0_/_0.15))]"
                      >
                        {segments.length === 1 ? (
                          <circle cx={CENTER} cy={CENTER} r={RADIUS} fill={SLICE_COLORS[0]} stroke="var(--surface)" strokeWidth={2} />
                        ) : (
                          segments.map((r, i) => {
                            const segAngle = 360 / segments.length;
                            const isLit = i === highlightIdx;
                            return (
                              <path
                                key={r.id}
                                d={slicePath(i * segAngle, (i + 1) * segAngle)}
                                fill={SLICE_COLORS[i % SLICE_COLORS.length]}
                                opacity={spinning ? (isLit ? 1 : 0.45) : 1}
                                stroke={isLit ? "var(--foreground)" : "var(--surface)"}
                                strokeWidth={isLit ? 4 : 2}
                                className="transition-[opacity,stroke-width] duration-150"
                                style={isLit ? { filter: "drop-shadow(0 0 6px var(--primary))" } : undefined}
                              />
                            );
                          })
                        )}
                        {segments.map((r, i) => {
                          const segAngle = 360 / segments.length;
                          const mid = i * segAngle + segAngle / 2;
                          return (
                            <text
                              key={r.id}
                              x={CENTER}
                              y={CENTER - RADIUS * 0.62}
                              textAnchor="middle"
                              transform={`rotate(${mid} ${CENTER} ${CENTER})`}
                              className="fill-primary-foreground text-[11px] font-medium"
                            >
                              {truncate(r.title)}
                            </text>
                          );
                        })}
                      </svg>

                      <div className="absolute left-1/2 top-1/2 z-20 h-20 w-20 -translate-x-1/2 -translate-y-1/2">
                        {spinning && (
                          <span
                            key={highlightIdx}
                            aria-hidden="true"
                            className="value-pulse absolute inset-0 rounded-full"
                            style={{ boxShadow: `0 0 0 8px color-mix(in oklab, ${litColor} 35%, transparent)` }}
                          />
                        )}
                        <button
                          type="button"
                          onClick={spin}
                          disabled={spinning}
                          aria-label="Gira la ruota"
                          className="flex h-full w-full items-center justify-center rounded-full text-sm font-semibold text-primary-foreground shadow-[var(--glow)] transition-[transform,background-color] duration-200 active:scale-95 disabled:pointer-events-none"
                          style={{ backgroundColor: spinning ? litColor : "var(--primary)" }}
                        >
                          {spinning ? <Spinner className="h-6 w-6" /> : "GIRA"}
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {celebrating && (
                  <CookedCelebration count={80} durationMs={1200} onDone={() => setCelebrating(false)} />
                )}
              </div>

              {winner && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2 }}
                  className="flex gap-2"
                >
                  <Button type="button" onClick={() => router.push(`/recipes/${winner.id}`)} className="flex-1">
                    Vai alla ricetta
                  </Button>
                  <Button type="button" variant="ghost" onClick={spin}>
                    Gira di nuovo
                  </Button>
                </motion.div>
              )}
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
