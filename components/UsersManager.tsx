"use client";

import { useEffect, useRef, useState } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { Spinner } from "@/components/ui/Spinner";
import { ConfirmDialog, type ConfirmDialogHandle } from "@/components/ui/ConfirmDialog";
import { useToast } from "@/components/ui/Toast";
import { loadJson, reportIfFailed } from "@/lib/clientFetch";
import type { UserSummary } from "@/lib/users";

export function UsersManager({ currentUserId }: { currentUserId: string }) {
  const toast = useToast();
  const [users, setUsers] = useState<UserSummary[] | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [creating, setCreating] = useState(false);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const deleteDialogRef = useRef<ConfirmDialogHandle>(null);
  const demoteDialogRef = useRef<ConfirmDialogHandle>(null);
  const promoteDialogRef = useRef<ConfirmDialogHandle>(null);

  function load() {
    loadJson<UserSummary[]>("/api/users", toast, setUsers);
  }

  // eslint-disable-next-line react-hooks/exhaustive-deps -- toast identity is stable, omitted to avoid re-running the load on every render
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
    const created: UserSummary = await res.json();
    toast.success("Utente creato");
    setName("");
    setEmail("");
    setPassword("");
    setUsers((prev) => (prev ? [...prev, created] : [created]));
  }

  async function toggleAdmin(u: UserSummary) {
    const dialog = u.isAdmin ? demoteDialogRef : promoteDialogRef;
    const confirmed = await dialog.current?.open();
    if (!confirmed) return;
    setPendingId(u.id);
    const res = await fetch(`/api/users/${u.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isAdmin: !u.isAdmin }),
    });
    setPendingId(null);
    if (await reportIfFailed(res, toast)) return;
    toast.success(u.isAdmin ? "Admin rimosso" : "Utente promosso ad admin");
    setUsers((prev) => prev?.map((x) => (x.id === u.id ? { ...x, isAdmin: !u.isAdmin } : x)) ?? prev);
  }

  async function deleteUser(u: UserSummary) {
    const confirmed = await deleteDialogRef.current?.open();
    if (!confirmed) return;
    setPendingId(u.id);
    const res = await fetch(`/api/users/${u.id}`, { method: "DELETE" });
    setPendingId(null);
    if (await reportIfFailed(res, toast)) return;
    toast.success("Utente eliminato");
    setUsers((prev) => prev?.filter((x) => x.id !== u.id) ?? prev);
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
            <Card key={u.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-foreground">{u.name}</p>
                <p className="truncate text-sm text-muted-foreground">{u.email}</p>
              </div>
              <div className="flex flex-wrap items-center gap-2 sm:shrink-0">
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
        ref={deleteDialogRef}
        title="Eliminare questo utente?"
        description="L'operazione non è reversibile."
        confirmLabel="Elimina"
      />
      <ConfirmDialog
        ref={demoteDialogRef}
        title="Rimuovere i permessi di admin?"
        description="L'utente perderà l'accesso alle impostazioni di amministrazione."
        confirmLabel="Rimuovi admin"
      />
      <ConfirmDialog
        ref={promoteDialogRef}
        title="Rendere questo utente admin?"
        description="Otterrà accesso completo alle impostazioni di amministrazione, inclusa la gestione degli altri utenti."
        confirmLabel="Rendi admin"
        confirmVariant="primary"
      />
    </>
  );
}
