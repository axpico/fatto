"use client";

import dynamic from "next/dynamic";
import { Spinner } from "@/components/ui/Spinner";

// Client-only: the viewer's first render depends on the browser (restored session and timers
// from localStorage, SpeechRecognition support, checked ingredients). Rendering it on the server
// produced a different tree and a hydration mismatch on every load.
export const CookingModeClient = dynamic(
  () => import("@/components/CookingModeViewer").then((m) => m.CookingModeViewer),
  {
    ssr: false,
    loading: () => (
      <div className="fixed inset-0 flex items-center justify-center bg-background">
        <Spinner className="h-8 w-8 text-muted-foreground" />
      </div>
    ),
  },
);
