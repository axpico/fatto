"use client";

import { createContext, useCallback, useContext, useState, type ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { CheckCircle2, XCircle } from "lucide-react";

type ToastVariant = "success" | "error";
type ToastAction = { label: string; onClick: () => void };
type ToastItem = { id: number; message: string; variant: ToastVariant; action?: ToastAction };

type ToastContextValue = {
  success: (message: string) => void;
  error: (message: string) => void;
  withAction: (message: string, action: ToastAction, opts?: { duration?: number }) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

let nextId = 0;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const push = useCallback((message: string, variant: ToastVariant, action?: ToastAction, duration = 4000) => {
    const id = nextId++;
    setToasts((prev) => [...prev, { id, message, variant, action }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), duration);
  }, []);

  const value: ToastContextValue = {
    success: (message) => push(message, "success"),
    error: (message) => push(message, "error"),
    withAction: (message, action, opts) => push(message, "success", action, opts?.duration ?? 5500),
  };

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 bottom-16 z-40 flex flex-col items-center gap-2 px-4 print:hidden md:bottom-6">
        <AnimatePresence initial={false}>
          {toasts.map((t) => (
            <motion.div
              key={t.id}
              layout
              initial={{ opacity: 0, y: 12, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              role={t.variant === "error" ? "alert" : "status"}
              aria-live={t.variant === "error" ? "assertive" : "polite"}
              className={`pointer-events-auto flex w-full max-w-sm items-center gap-2 rounded-xl border px-4 py-3 text-sm shadow-md ${
                t.variant === "error"
                  ? "border-destructive/30 bg-surface text-destructive"
                  : "border-success/30 bg-surface text-success"
              }`}
            >
              {t.variant === "error" ? (
                <XCircle className="h-4 w-4 shrink-0" aria-hidden="true" />
              ) : (
                <CheckCircle2 className="h-4 w-4 shrink-0" aria-hidden="true" />
              )}
              {t.message}
              {t.action && (
                <button
                  type="button"
                  onClick={() => {
                    setToasts((prev) => prev.filter((item) => item.id !== t.id));
                    t.action?.onClick();
                  }}
                  className="ml-1 shrink-0 text-sm font-medium underline underline-offset-2"
                >
                  {t.action.label}
                </button>
              )}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
}
