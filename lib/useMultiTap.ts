import { useRef, type MouseEvent } from "react";

const REQUIRED_TAPS = 6;
const WINDOW_MS = 1500;

/** Fires once N quick taps land on the same element within the window; lets earlier taps through normally. */
export function useMultiTap(onTrigger: () => void, requiredTaps = REQUIRED_TAPS, windowMs = WINDOW_MS) {
  const countRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function reset() {
    countRef.current = 0;
    if (timerRef.current) clearTimeout(timerRef.current);
  }

  function onClick(e: MouseEvent) {
    countRef.current += 1;
    if (timerRef.current) clearTimeout(timerRef.current);

    if (countRef.current >= requiredTaps) {
      e.preventDefault();
      reset();
      onTrigger();
      return;
    }
    timerRef.current = setTimeout(reset, windowMs);
  }

  return { onClick };
}
