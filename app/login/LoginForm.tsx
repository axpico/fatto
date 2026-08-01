"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { ErrorBanner } from "@/components/ui/ErrorBanner";
import { reportIfFailed } from "@/lib/apiError";

export function LoginForm() {
  const router = useRouter();
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

    router.push("/");
    router.refresh();
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-8">
      <Card className="w-full max-w-sm p-6 shadow-md sm:p-8">
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <p className="eyebrow mb-2">Il tuo ricettario</p>
            <p className="font-display text-4xl font-semibold tracking-tight text-foreground">Fatto</p>
            <p className="mt-1.5 text-sm text-muted-foreground">Accedi al tuo ricettario personale.</p>
          </div>

          {error && <ErrorBanner>{error}</ErrorBanner>}

          <Input
            id="email"
            label="Email"
            type="email"
            required
            autoFocus
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />

          <Input
            id="password"
            label="Password"
            type="password"
            required
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
