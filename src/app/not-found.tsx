import Link from "next/link";
import { Store, ArrowLeft } from "lucide-react";
import { Logo } from "@/components/ui/logo";

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center p-6 text-center">
      <Logo className="mb-8" />
      <div className="grid size-16 place-items-center rounded-3xl bg-sand text-muted mb-4">
        <Store className="size-8" />
      </div>
      <h1 className="text-2xl font-black text-ink">Page ou boutique introuvable</h1>
      <p className="mt-2 text-sm text-muted leading-relaxed">
        L&apos;adresse demandée n&apos;existe pas ou la boutique a peut-être changé de lien.
      </p>
      <Link
        href="/"
        className="mt-6 inline-flex h-11 items-center gap-2 rounded-2xl bg-brand-600 px-5 text-xs font-bold text-white shadow-xs hover:bg-brand-700 transition-colors"
      >
        <ArrowLeft className="size-4" />
        <span>Retour à l&apos;accueil</span>
      </Link>
    </main>
  );
}
