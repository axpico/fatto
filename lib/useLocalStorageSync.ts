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

  // storage can throw (blocked cookies/site data, some private modes): fall back, never crash
  function getSnapshot(): T {
    try {
      return resolve(localStorage.getItem(key));
    } catch {
      return serverValue;
    }
  }

  function getServerSnapshot(): T {
    return serverValue;
  }

  function set(raw: string) {
    try {
      localStorage.setItem(key, raw);
    } catch {
      return;
    }
    window.dispatchEvent(new Event(event));
  }

  const value = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  return [value, set];
}
