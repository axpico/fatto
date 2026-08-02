"use client";

import { useState } from "react";
import { Canvas } from "@react-three/fiber";
import { Sparkles } from "@react-three/drei";

// One-shot celebratory burst, same look as CookAmbientScene at higher
// intensity, for the "mark cooked" moment. No mobile gate: it's a ~1.2s
// burst rather than an ambient during-cook layer, so the perf tradeoff
// CookAmbientScene makes doesn't apply here.
export function CookedCelebration({ onDone }: { onDone: () => void }) {
  const [color] = useState(
    () => getComputedStyle(document.documentElement).getPropertyValue("--primary").trim() || "#f0a24b",
  );

  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    return null;
  }

  return (
    <Canvas
      className="pointer-events-none absolute inset-0"
      dpr={[1, 1.5]}
      camera={{ position: [0, 0, 6], fov: 45 }}
      gl={{ alpha: true, antialias: true }}
      onCreated={() => {
        setTimeout(onDone, 1200);
      }}
    >
      <ambientLight intensity={0.8} />
      <Sparkles count={80} scale={[6, 3, 3]} size={4} speed={0.6} opacity={0.8} color={color} />
    </Canvas>
  );
}
