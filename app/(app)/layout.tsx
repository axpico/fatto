import { requireUser } from "@/lib/auth";
import { NavBar } from "@/components/NavBar";
import { DesktopNav } from "@/components/DesktopNav";
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
            <DesktopNav />
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
