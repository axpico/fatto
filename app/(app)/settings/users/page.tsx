import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { UsersManager } from "@/components/UsersManager";

export default async function UsersSettingsPage() {
  const user = await requireUser();
  if (!user.isAdmin) redirect("/settings");

  return (
    <div className="page-shell page-shell-narrow space-y-6">
      <div className="page-header">
        <div>
          <h1 className="page-title">Utenti</h1>
          <p className="page-description">Crea nuovi account per la famiglia.</p>
        </div>
      </div>

      <UsersManager currentUserId={user.id} />
    </div>
  );
}
