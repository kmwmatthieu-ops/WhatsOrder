import { Suspense } from "react";
import { requireShop } from "@/lib/supabase/server";
import { ReturnClientView } from "./return-client-view";

interface ReturnPageProps {
  searchParams: Promise<{
    session_id?: string;
  }>;
}

export default async function SaspayReturnPage({ searchParams }: ReturnPageProps) {
  await requireShop();
  const { session_id } = await searchParams;

  return (
    <div className="flex min-h-[70vh] items-center justify-center p-4">
      <Suspense fallback={<ReturnLoadingSkeleton />}>
        <ReturnClientView sessionId={session_id || ""} />
      </Suspense>
    </div>
  );
}

function ReturnLoadingSkeleton() {
  return (
    <div className="flex flex-col items-center justify-center gap-4 rounded-3xl border border-line bg-white p-8 text-center shadow-xs max-w-md w-full">
      <div className="size-10 animate-spin rounded-full border-3 border-brand-600 border-t-transparent" />
      <p className="text-sm font-bold text-ink">Vérification de votre paiement…</p>
      <p className="text-xs text-muted">Connexion sécurisée avec SasPay en cours.</p>
    </div>
  );
}
