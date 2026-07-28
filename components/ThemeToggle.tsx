"use client";

import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { resolveTheme, THEME_STORAGE_KEY, type Theme } from "@/lib/theme";
import { useLocalStorageSync } from "@/lib/useLocalStorageSync";

const THEME_EVENT = "fatto-theme-change";

function resolve(stored: string | null): Theme {
  const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  return resolveTheme(stored, prefersDark);
}

export function ThemeToggle() {
  const theme = useLocalStorageSync(THEME_STORAGE_KEY, THEME_EVENT, resolve, "light");

  function toggle() {
    const next: Theme = theme === "dark" ? "light" : "dark";
    localStorage.setItem(THEME_STORAGE_KEY, next);
    document.documentElement.dataset.theme = next;
    window.dispatchEvent(new Event(THEME_EVENT));
  }

  return (
    <Button type="button" variant="secondary" onClick={toggle} className="gap-2">
      {theme === "dark" ? <Sun className="h-4 w-4" aria-hidden="true" /> : <Moon className="h-4 w-4" aria-hidden="true" />}
      {theme === "dark" ? "Tema chiaro" : "Tema scuro"}
    </Button>
  );
}
