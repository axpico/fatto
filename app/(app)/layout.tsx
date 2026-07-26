import { requireUser } from "@/lib/auth";
import { NavBar } from "@/components/NavBar";
import { LogoutButton } from "@/components/LogoutButton";
import { ToastProvider } from "@/components/ui/Toast";

export default async function AppLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const user = await requireUser();

  return (
    <ToastProvider>
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-primary focus:px-4 focus:py-2 focus:text-white"
      >
        Vai al contenuto
      </a>
      <div className="flex min-h-screen flex-col">
        <header className="print:hidden border-b border-border bg-surface px-4 py-3">
          <div className="mx-auto flex w-full max-w-2xl items-center justify-between">
            <span className="font-display font-semibold text-foreground">Recipe Book</span>
            <div className="flex items-center gap-1">
              <span className="text-sm text-muted-foreground">{user.name}</span>
              <LogoutButton />
            </div>
          </div>
        </header>

        <main id="main-content" className="mx-auto w-full max-w-2xl flex-1 pb-16">
          {children}
        </main>

        <NavBar aria-label="Navigazione principale" />
      </div>
    </ToastProvider>
  );
}
