"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { motion, useReducedMotion } from "framer-motion";
import { Dices } from "lucide-react";
import { type RecipeCardData } from "@/components/RecipeCard";
import { UploadedImage } from "@/components/UploadedImage";
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

  return (
    <div className="page-shell max-w-md space-y-6">
      <Card className="space-y-5 p-4 sm:p-5">
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
          <div className="space-y-5">
            <div className="relative mx-auto aspect-square w-full max-w-[380px]">
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
                        opacity={spinning || winner ? (isLit ? 1 : 0.45) : 1}
                        stroke={isLit ? "var(--foreground)" : "var(--surface)"}
                        strokeWidth={isLit ? 4 : 2}
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

              <button
                type="button"
                onClick={spin}
                disabled={spinning}
                aria-label="Gira la ruota"
                className="absolute left-1/2 top-1/2 z-20 flex h-20 w-20 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground shadow-[var(--glow)] transition-transform duration-200 active:scale-95 disabled:pointer-events-none disabled:opacity-70"
              >
                {spinning ? <Spinner className="h-6 w-6" /> : "GIRA"}
              </button>

              {celebrating && (
                <CookedCelebration count={80} durationMs={1200} onDone={() => setCelebrating(false)} />
              )}
            </div>

            {winner && !spinning && (
              <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
                <Card className="flex items-center gap-4 p-4">
                  {winner.photoUrl ? (
                    <UploadedImage
                      filename={winner.photoUrl}
                      alt={winner.title}
                      className="h-16 w-16 shrink-0 rounded-lg object-cover"
                    />
                  ) : (
                    <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-lg bg-surface-secondary text-muted-foreground">
                      <Dices className="h-6 w-6" aria-hidden="true" />
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-display text-lg font-semibold text-foreground">{winner.title}</p>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => router.push(`/recipes/${winner.id}`)}
                      className="mt-1 px-0"
                    >
                      Vai alla ricetta
                    </Button>
                  </div>
                </Card>
              </motion.div>
            )}
          </div>
        )}
      </Card>
    </div>
  );
}
