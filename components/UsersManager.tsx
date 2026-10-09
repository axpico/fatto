"use client";

import { useEffect, useRef, useState } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { Spinner } from "@/components/ui/Spinner";
import { ConfirmDialog, type ConfirmDialogHandle } from "@/components/ui/ConfirmDialog";
import { Modal, type ModalHandle } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toast";
import { loadJson, reportIfFailed } from "@/lib/clientFetch";
import type { UserSummary } from "@/lib/users";

const MIN_PASSWORD_LENGTH = 8;

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
  const resetDialogRef = useRef<ConfirmDialogHandle>(null);
  const passwordModalRef = useRef<ModalHandle>(null);
  const [temporaryPassword, setTemporaryPassword] = useState<string | null>(null);
  const passwordTooShort = password.length > 0 && password.length < MIN_PASSWORD_LENGTH;

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

  async function resetPassword(u: UserSummary) {
    const confirmed = await resetDialogRef.current?.open();
    if (!confirmed) return;
    setPendingId(u.id);
    const res = await fetch(`/api/users/${u.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ resetPassword: true }),
    });
    setPendingId(null);
    if (await reportIfFailed(res, toast)) return;
    const data: { temporaryPassword: string } = await res.json();
    setTemporaryPassword(data.temporaryPassword);
    passwordModalRef.current?.open();
  }

  async function copyPassword() {
    if (!temporaryPassword) return;
    try {
      await navigator.clipboard.writeText(temporaryPassword);
      toast.success("Password copiata");
    } catch {
      toast.error("Copia non riuscita: selezionala a mano");
    }
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
          {/* ids/autocomplete distinct from the login form: keeps the browser from autofilling
              the admin's own credentials into the new-user fields */}
          <Input
            id="new-user-name"
            label="Nome"
            required
            autoComplete="off"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <Input
            id="new-user-email"
            label="Email"
            type="email"
            required
            autoComplete="off"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <div className="space-y-1">
            <Input
              id="new-user-password"
              label="Password"
              type="password"
              required
              autoComplete="new-password"
              minLength={MIN_PASSWORD_LENGTH}
              aria-invalid={passwordTooShort}
              aria-describedby="new-user-password-hint"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <p
              id="new-user-password-hint"
              className={`text-xs ${passwordTooShort ? "text-destructive" : "text-muted-foreground"}`}
            >
              Almeno {MIN_PASSWORD_LENGTH} caratteri
            </p>
          </div>
          <Button type="submit" disabled={creating || passwordTooShort} className="w-full">
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
                      variant="secondary"
                      size="sm"
                      disabled={pendingId === u.id}
                      onClick={() => resetPassword(u)}
                    >
                      Reimposta password
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
        ref={resetDialogRef}
        title="Reimpostare la password?"
        description="Verrà generata una nuova password e l'utente sarà disconnesso da tutti i dispositivi."
        confirmLabel="Reimposta"
      />
      <Modal ref={passwordModalRef} title="Nuova password" onCancel={() => setTemporaryPassword(null)}>
        <p className="text-sm text-muted-foreground">Comunicala all&apos;utente: non verrà più mostrata.</p>
        <p className="mt-3 select-all rounded-md bg-surface-secondary p-3 text-center font-mono text-lg">
          {temporaryPassword}
        </p>
        <Button type="button" className="mt-3 w-full" onClick={copyPassword}>
          Copia
        </Button>
      </Modal>
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
