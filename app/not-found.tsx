import Link from "next/link";
import { buttonClasses } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";

export default function NotFound() {
  return (
    <div className="p-4">
      <EmptyState
        title="Pagina non trovata"
        description="Il link potrebbe essere sbagliato o la pagina non esiste più."
        action={
          <Link href="/" className={buttonClasses("primary", "md")}>
            Torna alle ricette
          </Link>
        }
      />
    </div>
  );
}
