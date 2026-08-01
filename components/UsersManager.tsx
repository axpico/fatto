"use client";

import { useEffect, useRef, useState } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { Spinner } from "@/components/ui/Spinner";
import { ConfirmDialog, type ConfirmDialogHandle } from "@/components/ui/ConfirmDialog";
import { useToast } from "@/components/ui/Toast";
import { reportIfFailed } from "@/lib/apiError";
import type { UserSummary } from "@/app/api/users/route";

export function UsersManager({ currentUserId }: { currentUserId: string }) {
  const toast = useToast();
  const [users, setUsers] = useState<UserSummary[] | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [creating, setCreating] = useState(false);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const dialogRef = useRef<ConfirmDialogHandle>(null);

  function load() {
    fetch("/api/users")
      .then((res) => res.json())
      .then(setUsers);
  }

  useEffect(load, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    const res = await fetch("/api/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, password }),
    });
    setCreating(false);
    if (await reportIfFailed(res, toast)) return;
    toast.success("Utente creato");
    setName("");
    setEmail("");
    setPassword("");
    setUsers(null);
    load();
  }

  async function toggleAdmin(u: UserSummary) {
    setPendingId(u.id);
    const res = await fetch(`/api/users/${u.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isAdmin: !u.isAdmin }),
    });
    setPendingId(null);
    if (await reportIfFailed(res, toast)) return;
    toast.success(u.isAdmin ? "Admin rimosso" : "Utente promosso ad admin");
    setUsers(null);
    load();
  }

  async function deleteUser(u: UserSummary) {
    const confirmed = await dialogRef.current?.open();
    if (!confirmed) return;
    setPendingId(u.id);
    const res = await fetch(`/api/users/${u.id}`, { method: "DELETE" });
    setPendingId(null);
    if (await reportIfFailed(res, toast)) return;
    toast.success("Utente eliminato");
    setUsers(null);
    load();
  }

  return (
    <>
      <Card className="p-4">
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input id="name" label="Nome" required value={name} onChange={(e) => setName(e.target.value)} />
          <Input
            id="email"
            label="Email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <Input
            id="password"
            label="Password"
            type="password"
            required
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <Button type="submit" disabled={creating} className="w-full">
            {creating ? "Creazione in corso..." : "Crea utente"}
          </Button>
        </form>
      </Card>

      {users === null && (
        <div className="flex justify-center p-8">
          <Spinner />
        </div>
      )}

      {users && (
        <div className="space-y-3">
          {users.map((u) => (
            <Card key={u.id} className="flex items-center justify-between gap-3 p-4">
              <div>
                <p className="text-sm font-medium text-foreground">{u.name}</p>
                <p className="text-sm text-muted-foreground">{u.email}</p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                {u.isAdmin && <Badge variant="accent">Admin</Badge>}
                {u.id !== currentUserId && (
                  <>
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      disabled={pendingId === u.id}
                      onClick={() => toggleAdmin(u)}
                    >
                      {u.isAdmin ? "Rimuovi admin" : "Rendi admin"}
                    </Button>
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      disabled={pendingId === u.id}
                      onClick={() => deleteUser(u)}
                    >
                      Elimina
                    </Button>
                  </>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}

      <ConfirmDialog
        ref={dialogRef}
        title="Eliminare questo utente?"
        description="L'operazione non è reversibile."
        confirmLabel="Elimina"
      />
    </>
  );
}
