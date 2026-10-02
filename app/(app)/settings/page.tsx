import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { ThemeToggle } from "@/components/ThemeToggle";
import { UnitPreferenceToggle } from "@/components/UnitPreferenceToggle";
import { LogoutButton } from "@/components/LogoutButton";

export default async function SettingsPage() {
  const user = await requireUser();

  return (
    <div className="page-shell max-w-lg space-y-6">
      <div className="page-header">
        <div>
          <h1 className="page-title">Impostazioni</h1>
          <p className="page-description">Account e preferenze dell&apos;app.</p>
        </div>
      </div>

      <section>
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">Account</h2>
        <div className="panel flex items-center justify-between gap-4">
          <div className="min-w-0">
            <p className="text-sm font-medium text-foreground">{user.name}</p>
            <p className="truncate text-sm text-muted-foreground">{user.email}</p>
          </div>
          <LogoutButton />
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">Preferenze</h2>
        <div className="panel flex items-center justify-between gap-4">
          <div>
            <p className="font-medium text-foreground">Aspetto</p>
            <p className="text-sm text-muted-foreground">Passa dal tema chiaro a quello scuro.</p>
          </div>
          <ThemeToggle />
        </div>

        <div className="panel flex items-center justify-between gap-4">
          <div>
            <p className="font-medium text-foreground">Unità di misura</p>
            <p className="text-sm text-muted-foreground">Converti le quantità in grammi e millilitri.</p>
          </div>
          <UnitPreferenceToggle />
        </div>
      </section>

      {user.isAdmin && (
        <section className="space-y-3">
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">Amministrazione</h2>
          <Link href="/settings/tags" className="panel flex items-center justify-between gap-4 hover:bg-surface-secondary active:bg-surface-secondary">
            <div>
              <p className="font-medium text-foreground">Tag simili</p>
              <p className="text-sm text-muted-foreground">Unisci i tag quasi-duplicati.</p>
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
          </Link>
          <Link href="/settings/users" className="panel flex items-center justify-between gap-4 hover:bg-surface-secondary active:bg-surface-secondary">
            <div>
              <p className="font-medium text-foreground">Utenti</p>
              <p className="text-sm text-muted-foreground">Crea nuovi account per la famiglia.</p>
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
          </Link>
        </section>
      )}
    </div>
  );
}
