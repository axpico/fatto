"use client";

import { useRef, type HTMLAttributes, type PointerEvent as ReactPointerEvent } from "react";

const MAX_TILT_DEG = 6;

export function TiltCard({ className, children, ...props }: HTMLAttributes<HTMLDivElement>) {
  const ref = useRef<HTMLDivElement>(null);

  function handlePointerMove(e: ReactPointerEvent<HTMLDivElement>) {
    if (e.pointerType !== "mouse") return;
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const px = (e.clientX - rect.left) / rect.width - 0.5;
    const py = (e.clientY - rect.top) / rect.height - 0.5;
    el.style.transform = `perspective(700px) rotateX(${(-py * MAX_TILT_DEG).toFixed(2)}deg) rotateY(${(px * MAX_TILT_DEG).toFixed(2)}deg)`;
  }

  function resetTilt() {
    const el = ref.current;
    if (!el) return;
    el.style.transform = "";
  }

  return (
    <div
      ref={ref}
      className={["tilt-card", className].filter(Boolean).join(" ")}
      style={{ transition: "transform 150ms ease-out" }}
      onPointerMove={handlePointerMove}
      onPointerLeave={resetTilt}
      {...props}
    >
      {children}
    </div>
  );
}
