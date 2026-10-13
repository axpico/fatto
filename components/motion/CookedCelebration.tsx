"use client";

import { useEffect, useState } from "react";
import { Canvas } from "@react-three/fiber";
import { Sparkles } from "@react-three/drei";

// One-shot celebratory burst, same look as CookAmbientScene at higher
// intensity, for the "mark cooked" moment. No mobile gate: it's a ~1.2s
// burst rather than an ambient during-cook layer, so the perf tradeoff
// CookAmbientScene makes doesn't apply here.
export function CookedCelebration({
  onDone,
  colorVar = "--primary",
  count = 80,
  opacity = 0.8,
  durationMs = 1200,
}: {
  onDone: () => void;
  colorVar?: string;
  count?: number;
  opacity?: number;
  durationMs?: number;
}) {
  const [color] = useState(
    () => getComputedStyle(document.documentElement).getPropertyValue(colorVar).trim() || "#f0a24b",
  );
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // onDone must fire regardless of whether the WebGL canvas actually
  // renders — reduced motion skips it outright, and on some setups (no
  // GPU context, e.g. software rendering) the Canvas never fires
  // onCreated. Anything gating navigation on onDone (e.g. the swipe deck)
  // would otherwise hang forever.
  useEffect(() => {
    if (reduced) {
      onDone();
      return;
    }
    const timer = setTimeout(onDone, durationMs);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- fire once per mount
  }, [reduced]);

  if (reduced) {
    return null;
  }

  return (
    <Canvas
      className="pointer-events-none inset-0"
      // Canvas sets an inline `position: relative` that beats a class: without this the canvas sits
      // in the flow and pushes the layout down instead of overlaying it
      style={{ position: "absolute" }}
      dpr={[1, 1.5]}
      camera={{ position: [0, 0, 6], fov: 45 }}
      gl={{ alpha: true, antialias: true }}
    >
      <ambientLight intensity={0.8} />
      <Sparkles count={count} scale={[6, 3, 3]} size={4} speed={0.6} opacity={opacity} color={color} />
    </Canvas>
  );
}
