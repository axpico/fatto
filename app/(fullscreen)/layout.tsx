import { requireUser } from "@/lib/auth";
import { ToastProvider } from "@/components/ui/Toast";

// Cucina e stampa occupano tutto lo schermo: niente header, nav o transizioni dell'app sotto
export default async function FullscreenLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  await requireUser();
  return (
    <ToastProvider>
      <main id="main-content">{children}</main>
    </ToastProvider>
  );
}
