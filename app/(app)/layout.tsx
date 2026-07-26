import { requireUser } from "@/lib/auth";
import { NavBar } from "@/components/NavBar";
import { LogoutButton } from "@/components/LogoutButton";
import { ToastProvider } from "@/components/ui/Toast";
import { House, Search, Plus, CalendarDays, ShoppingCart } from "lucide-react";
import Link from "next/link";

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
        <header className="print:hidden sticky top-0 z-20 border-b border-border bg-surface/90 px-4 py-3 backdrop-blur md:px-6">
          <div className="mx-auto flex w-full max-w-5xl items-center justify-between gap-4">
            <Link href="/" className="font-display text-lg font-semibold tracking-tight text-foreground">Fatto</Link>
            <nav aria-label="Navigazione desktop" className="hidden items-center gap-1 md:flex">
              {[["/", "Ricette", House], ["/search", "Cerca", Search], ["/import", "Importa", Plus], ["/plan", "Piano", CalendarDays], ["/shopping-list", "Spesa", ShoppingCart]].map(([href, label, Icon]) => (
                <Link key={href as string} href={href as string} className="inline-flex min-h-9 items-center gap-1.5 rounded-md px-3 text-sm text-muted-foreground transition-colors hover:bg-surface-secondary hover:text-foreground">
                  {typeof Icon === "function" && <Icon className="h-4 w-4" aria-hidden="true" />} {label as string}
                </Link>
              ))}
            </nav>
            <div className="flex items-center gap-1">
              <span className="hidden text-sm text-muted-foreground sm:inline">{user.name}</span>
              <LogoutButton />
            </div>
          </div>
        </header>

        <main id="main-content" className="w-full flex-1 pb-20 md:pb-0">
          {children}
        </main>

        <NavBar aria-label="Navigazione principale" />
      </div>
    </ToastProvider>
  );
}
