"use client";

import { useEffect, useRef, type HTMLAttributes, type PointerEvent as ReactPointerEvent } from "react";

const MAX_TILT_DEG = 6;

// Interactive "lit depth" for cards: pointer-tracked 3D tilt plus a specular
// glare that follows the cursor, so cards feel physically lit in the dark.
// ponytail: pure CSS 3D transforms + a gradient glare layer — a WebGL canvas
// per card would tank perf for the same look.
export function TiltCard({ className, children, ...props }: HTMLAttributes<HTMLDivElement>) {
  const ref = useRef<HTMLDivElement>(null);

  // Touch has no cursor to track, so give it a scroll-driven tilt instead:
  // the card rotates from the pointer's-eye perspective as it passes through
  // the middle of the screen. rAF-throttled scroll listener, no glare (no
  // point of contact to anchor it to).
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (!window.matchMedia("(pointer: coarse)").matches) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let raf = 0;
    function update() {
      raf = 0;
      const rect = el!.getBoundingClientRect();
      const offset = (rect.top + rect.height / 2 - window.innerHeight / 2) / (window.innerHeight / 2);
      const rotateX = Math.max(-1, Math.min(1, offset)) * MAX_TILT_DEG;
      el!.style.transform = `perspective(800px) rotateX(${rotateX.toFixed(2)}deg)`;
    }
    function onScroll() {
      if (!raf) raf = requestAnimationFrame(update);
    }
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  function handlePointerMove(e: ReactPointerEvent<HTMLDivElement>) {
    if (e.pointerType !== "mouse") return;
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const px = (e.clientX - rect.left) / rect.width;
    const py = (e.clientY - rect.top) / rect.height;
    el.style.transform = `perspective(800px) rotateX(${((0.5 - py) * MAX_TILT_DEG).toFixed(2)}deg) rotateY(${((px - 0.5) * MAX_TILT_DEG).toFixed(2)}deg)`;
    el.style.setProperty("--mx", `${(px * 100).toFixed(1)}%`);
    el.style.setProperty("--my", `${(py * 100).toFixed(1)}%`);
    el.style.setProperty("--glare-o", "1");
  }

  function reset() {
    const el = ref.current;
    if (!el) return;
    el.style.transform = "";
    el.style.setProperty("--glare-o", "0");
  }

  return (
    <div
      ref={ref}
      className={["tilt-card relative rounded-xl", className].filter(Boolean).join(" ")}
      style={{ transition: "transform 150ms ease-out" }}
      onPointerMove={handlePointerMove}
      onPointerLeave={reset}
      {...props}
    >
      {children}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 rounded-[inherit] mix-blend-screen transition-opacity duration-200"
        style={{
          opacity: "var(--glare-o, 0)",
          background:
            "radial-gradient(circle at var(--mx, 50%) var(--my, 50%), rgb(255 214 150 / 0.22), transparent 45%)",
        }}
      />
    </div>
  );
}
