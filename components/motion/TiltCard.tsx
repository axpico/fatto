"use client";

import { useRef, type HTMLAttributes, type PointerEvent as ReactPointerEvent } from "react";

const MAX_TILT_DEG = 6;

// Interactive "lit depth" for cards: pointer-tracked 3D tilt plus a specular
// glare that follows the cursor, so cards feel physically lit in the dark.
// ponytail: pure CSS 3D transforms + a gradient glare layer — a WebGL canvas
// per card would tank perf for the same look. Mouse only; touch gets nothing.
export function TiltCard({ className, children, ...props }: HTMLAttributes<HTMLDivElement>) {
  const ref = useRef<HTMLDivElement>(null);

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
