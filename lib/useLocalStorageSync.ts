"use client";

import { useSyncExternalStore } from "react";

export function useLocalStorageSync<T>(
  key: string,
  event: string,
  resolve: (stored: string | null) => T,
  serverValue: T,
): T {
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

  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
