"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertCircle, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { captureError } from "@/lib/monitoring/error-tracker";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    captureError(error, {
      location: "app-error-boundary",
      digest: error.digest,
    });
  }, [error]);

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center p-6 text-center">
      <span className="grid size-16 place-items-center rounded-3xl bg-danger-50 text-danger-600 mb-4">
        <AlertCircle className="size-8" />
      </span>
      <h1 className="text-xl font-extrabold text-ink">Une erreur est survenue</h1>
      <p className="mt-2 text-xs text-muted leading-relaxed max-w-xs">
        Nous n&apos;avons pas pu charger cette page. Vérifiez votre connexion internet puis réessayez.
      </p>

      <div className="mt-6 flex items-center gap-2.5">
        <Button onClick={reset} size="sm">
          <RotateCcw className="size-4" />
          <span>Réessayer</span>
        </Button>
        <Link
          href="/"
          className="inline-flex h-10 items-center justify-center rounded-2xl border border-line bg-white px-4 text-xs font-semibold text-ink hover:bg-sand"
        >
          Accueil
        </Link>
      </div>
    </main>
  );
}
