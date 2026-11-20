import Link from "next/link";
import { Logo } from "@/components/ui/logo";

/** Mise en page des écrans d'authentification : carte centrée, pleine largeur sur mobile. */
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col px-5 py-8">
      <Link href="/" className="mb-10 self-start" aria-label="Accueil">
        <Logo />
      </Link>
      <div className="flex-1">{children}</div>
    </main>
  );
}
