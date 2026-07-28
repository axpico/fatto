"use client";

import { useSyncExternalStore } from "react";

export function useLocalStorageSync<T>(
  key: string,
  event: string,
  resolve: (stored: string | null) => T,
  serverValue: T,
): [T, (raw: string) => void] {
  function subscribe(callback: () => void) {
    window.addEventListener(event, callback);
    return () => window.removeEventListener(event, callback);
  }

  function getSnapshot(): T {
    return resolve(localStorage.getItem(key));
  }

  function getServerSnapshot(): T {
    return serverValue;
  }

  function set(raw: string) {
    localStorage.setItem(key, raw);
    window.dispatchEvent(new Event(event));
  }

  const value = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  return [value, set];
}
