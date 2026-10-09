import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { ThemeToggle } from "@/components/ThemeToggle";
import { UnitToggle } from "@/components/UnitToggle";
import { LogoutButton } from "@/components/LogoutButton";

const groupTitle = "mb-2 px-1 text-sm font-medium text-muted-foreground";
// one card per group, rows separated by dividers (instead of a bordered panel per row)
const group = "divide-y divide-border overflow-hidden rounded-xl border border-border bg-surface shadow-sm";
const row = "flex min-h-14 items-center justify-between gap-4 px-4 py-3";

export default async function SettingsPage() {
  const user = await requireUser();

  return (
    <div className="page-shell page-shell-narrow space-y-6">
      <h1 className="page-title">Impostazioni</h1>

      <section>
        <h2 className={groupTitle}>Account</h2>
        <div className={group}>
          <div className={row}>
            <div className="min-w-0">
              <p className="text-sm font-medium text-foreground">{user.name}</p>
              <p className="truncate text-sm text-muted-foreground">{user.email}</p>
            </div>
            <LogoutButton />
          </div>
        </div>
      </section>

      <section>
        <h2 className={groupTitle}>Preferenze</h2>
        <div className={group}>
          <div className={row}>
            <p className="text-sm font-medium text-foreground">Tema</p>
            <ThemeToggle />
          </div>
          <div className={row}>
            <p className="text-sm font-medium text-foreground">Unità di misura</p>
            <UnitToggle size="md" />
          </div>
        </div>
      </section>

      {user.isAdmin && (
        <section>
          <h2 className={groupTitle}>Amministrazione</h2>
          <div className={group}>
            {([
              ["/settings/tags", "Tag simili"],
              ["/settings/users", "Utenti"],
            ] as const).map(([href, label]) => (
              <Link key={href} href={href} className={`${row} hover:bg-surface-secondary active:bg-surface-secondary`}>
                <span className="text-sm font-medium text-foreground">{label}</span>
                <ChevronRight className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
