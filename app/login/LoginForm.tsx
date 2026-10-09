"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { ErrorBanner } from "@/components/ui/ErrorBanner";
import { NETWORK_ERROR, reportIfFailed } from "@/lib/clientFetch";

export function LoginForm({ next }: { next: string }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    let res: Response;
    try {
      res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
    } catch {
      setError(NETWORK_ERROR);
      setLoading(false);
      return;
    }

    if (await reportIfFailed(res, { error: setError })) {
      setLoading(false);
      return;
    }

    router.push(next);
    router.refresh();
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-8">
      <Card className="w-full max-w-sm p-6 shadow-md sm:p-8">
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <h1 className="font-display text-4xl font-semibold tracking-tight text-foreground">Fatto</h1>
            <p className="mt-1.5 text-sm text-muted-foreground">Accedi al tuo ricettario.</p>
          </div>

          {error && <ErrorBanner>{error}</ErrorBanner>}

          <Input
            id="email"
            label="Email"
            type="email"
            required
            autoFocus
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />

          <Input
            id="password"
            label="Password"
            type="password"
            required
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />

          <Button type="submit" size="lg" disabled={loading} className="w-full">
            {loading ? "Accesso in corso..." : "Accedi"}
          </Button>
        </form>
      </Card>
    </div>
  );
}
