"use client";

import dynamic from "next/dynamic";

// ponytail: dynamic(..., { ssr: false }) va chiamato da un client component —
// da un server component Next rifiuta la build ("ssr: false is not allowed
// with next/dynamic in Server Components")
const HeroScene = dynamic(() => import("@/components/motion/HeroScene").then((m) => m.HeroScene), { ssr: false });

export function HeroSceneLoader() {
  return <HeroScene />;
}
