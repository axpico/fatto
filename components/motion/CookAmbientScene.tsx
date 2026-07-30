"use client";

import { useState } from "react";
import { Canvas } from "@react-three/fiber";
import { Sparkles } from "@react-three/drei";

// The one deliberate WebGL moment: a lit-ember layer drifting behind the
// cook-mode step, tinted from --primary. Content sits above it (z-10).
// ponytail: count/speed/opacity are a calibration knob — tuned by eye, a
// first-guess model won't look right. Gated off on mobile + reduced motion so
// phones in the kitchen stay light and smooth.
export function CookAmbientScene() {
  const [enabled] = useState(
    () =>
      typeof window !== "undefined" &&
      window.innerWidth >= 768 &&
      !window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  );
  const [color] = useState(
    () => getComputedStyle(document.documentElement).getPropertyValue("--primary").trim() || "#f0a24b",
  );

  if (!enabled) return null;

  return (
    <Canvas
      className="print:hidden"
      dpr={[1, 1.5]}
      camera={{ position: [0, 0, 6], fov: 45 }}
      gl={{ alpha: true, antialias: true }}
    >
      <ambientLight intensity={0.6} />
      <Sparkles count={40} scale={[10, 6, 3]} size={3} speed={0.12} opacity={0.4} color={color} />
    </Canvas>
  );
}
