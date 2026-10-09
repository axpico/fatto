"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion, useReducedMotion } from "framer-motion";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { ErrorBanner } from "@/components/ui/ErrorBanner";
import { reportIfFailed } from "@/lib/clientFetch";

// Staggered entrance for the login card's own contents — kept out of PageTransition
// since /login sits outside the (app) layout that mounts it.
const fieldVariants = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0 },
};

export function LoginForm({ next }: { next: string }) {
  const router = useRouter();
  const reducedMotion = useReducedMotion();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    if (await reportIfFailed(res, { error: setError })) {
      setLoading(false);
      return;
    }

    router.push(next);
    router.refresh();
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background px-4 py-8">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-1/3 left-1/2 h-[36rem] w-[36rem] -translate-x-1/2 rounded-full blur-3xl"
        style={{
          background: "radial-gradient(circle, color-mix(in oklab, var(--primary) 20%, transparent), transparent 70%)",
        }}
      />

      <motion.div
        initial={reducedMotion ? false : "hidden"}
        animate="show"
        variants={{ show: { transition: { staggerChildren: 0.07, delayChildren: 0.05 } } }}
        className="relative w-full max-w-sm"
      >
        <Card className="p-6 shadow-md sm:p-8">
          <form onSubmit={handleSubmit} className="space-y-5">
            <motion.div variants={fieldVariants} transition={{ duration: 0.35, ease: "easeOut" }}>
              <p className="eyebrow mb-2">Il tuo ricettario</p>
              <p className="font-display text-4xl font-semibold tracking-tight text-foreground">Fatto</p>
              <p className="mt-1.5 text-sm text-muted-foreground">Accedi al tuo ricettario personale.</p>
            </motion.div>

            {error && <ErrorBanner>{error}</ErrorBanner>}

            <motion.div variants={fieldVariants} transition={{ duration: 0.35, ease: "easeOut" }}>
              <Input
                id="email"
                label="Email"
                type="email"
                required
                autoFocus
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </motion.div>

            <motion.div variants={fieldVariants} transition={{ duration: 0.35, ease: "easeOut" }}>
              <Input
                id="password"
                label="Password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </motion.div>

            <motion.div variants={fieldVariants} transition={{ duration: 0.35, ease: "easeOut" }}>
              <Button type="submit" size="lg" disabled={loading} className="w-full">
                {loading ? "Accesso in corso..." : "Accedi"}
              </Button>
            </motion.div>
          </form>
        </Card>
      </motion.div>
    </div>
  );
}
