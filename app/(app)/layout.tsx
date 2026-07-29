import { requireUser } from "@/lib/auth";
import { NavBar } from "@/components/NavBar";
import { NAV_ITEMS } from "@/lib/navItems";
import { ToastProvider } from "@/components/ui/Toast";
import { PageTransition } from "@/components/motion/PageTransition";
import Link from "next/link";

export default async function AppLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  await requireUser();

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
              {NAV_ITEMS.map(({ href, label, icon: Icon }) => (
                <Link key={href} href={href} className="inline-flex min-h-9 items-center gap-1.5 rounded-md px-3 text-sm text-muted-foreground transition-colors hover:bg-surface-secondary hover:text-foreground">
                  <Icon className="h-4 w-4" aria-hidden="true" /> {label}
                </Link>
              ))}
            </nav>
          </div>
        </header>

        <main id="main-content" className="w-full flex-1 pb-20 md:pb-0">
          <PageTransition>{children}</PageTransition>
        </main>

        <NavBar aria-label="Navigazione principale" />
      </div>
    </ToastProvider>
  );
}
