"use client";

import { Moon, Sun } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { Button } from "@/components/ui/Button";
import { resolveTheme, THEME_STORAGE_KEY, type Theme } from "@/lib/theme";
import { useLocalStorageSync } from "@/lib/useLocalStorageSync";

const THEME_EVENT = "fatto-theme-change";

function resolve(stored: string | null): Theme {
  const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  return resolveTheme(stored, prefersDark);
}

export function ThemeToggle() {
  const [theme, setTheme] = useLocalStorageSync(THEME_STORAGE_KEY, THEME_EVENT, resolve, "light");

  function toggle() {
    const next: Theme = theme === "dark" ? "light" : "dark";
    setTheme(next);
    document.documentElement.dataset.theme = next;
  }

  return (
    <Button type="button" variant="secondary" onClick={toggle} className="gap-2">
      <span className="relative flex h-4 w-4 items-center justify-center overflow-hidden">
        <AnimatePresence mode="wait" initial={false}>
          <motion.span
            key={theme}
            initial={{ opacity: 0, rotate: -90 }}
            animate={{ opacity: 1, rotate: 0 }}
            exit={{ opacity: 0, rotate: 90 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
            className="absolute inset-0 flex items-center justify-center"
          >
            {theme === "dark" ? <Sun className="h-4 w-4" aria-hidden="true" /> : <Moon className="h-4 w-4" aria-hidden="true" />}
          </motion.span>
        </AnimatePresence>
      </span>
      {theme === "dark" ? "Tema chiaro" : "Tema scuro"}
    </Button>
  );
}
