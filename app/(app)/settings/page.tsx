import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { ThemeToggle } from "@/components/ThemeToggle";
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

      <div className="panel space-y-1">
        <p className="text-sm font-medium text-foreground">{user.name}</p>
        <p className="text-sm text-muted-foreground">{user.email}</p>
      </div>

      <div className="panel flex items-center justify-between gap-4">
        <div>
          <p className="font-medium text-foreground">Aspetto</p>
          <p className="text-sm text-muted-foreground">Passa dal tema chiaro a quello scuro.</p>
        </div>
        <ThemeToggle />
      </div>

      <Link href="/settings/tags" className="panel flex items-center justify-between gap-4 hover:bg-surface-secondary">
        <div>
          <p className="font-medium text-foreground">Tag simili</p>
          <p className="text-sm text-muted-foreground">Unisci i tag quasi-duplicati.</p>
        </div>
        <ChevronRight className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
      </Link>

      <div className="panel flex items-center justify-between gap-4">
        <div>
          <p className="font-medium text-foreground">Sessione</p>
          <p className="text-sm text-muted-foreground">Esci dall&apos;account su questo dispositivo.</p>
        </div>
        <LogoutButton />
      </div>
    </div>
  );
}
