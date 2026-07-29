"use client";

import { useState } from "react";
import { Canvas } from "@react-three/fiber";
import { Sparkles } from "@react-three/drei";

// ponytail: solo la home monta questo componente (import dinamico, ssr:false),
// quindi window/document sono già disponibili al primo render lato client —
// niente effect, solo inizializzatori lazy di useState
export function HeroScene() {
  const [enabled] = useState(() => !window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  const [color] = useState(() => getComputedStyle(document.documentElement).getPropertyValue("--primary").trim() || "#b84d1b");

  if (!enabled) return null;

  return (
    <Canvas
      className="print:hidden"
      dpr={[1, 1.5]}
      camera={{ position: [0, 0, 6], fov: 45 }}
      gl={{ alpha: true, antialias: true }}
    >
      <ambientLight intensity={0.8} />
      <Sparkles count={70} scale={[9, 4, 3]} size={2.5} speed={0.2} opacity={0.55} color={color} />
    </Canvas>
  );
}
