import { isSupabaseConfigured } from "@/lib/constants";
import { AlertCircle, Terminal, CheckCircle2 } from "lucide-react";

export function SupabaseNotice() {
  if (isSupabaseConfigured()) {
    return null;
  }

  return (
    <div className="rounded-2xl border border-amber-300 bg-amber-50/80 p-4 text-xs sm:text-sm text-amber-900 shadow-xs">
      <div className="flex items-center gap-2 font-bold text-amber-950 mb-2">
        <AlertCircle className="size-4 shrink-0 text-amber-600" aria-hidden />
        <span>Connexion à Supabase requise pour tester</span>
      </div>
      <p className="text-amber-800 leading-relaxed mb-3">
        L'application a besoin d'être reliée à votre base Supabase pour créer votre compte et enregistrer votre boutique.
      </p>

      <div className="space-y-2 text-amber-900">
        <div className="flex items-start gap-2">
          <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-amber-200 text-[11px] font-bold text-amber-900">
            1
          </span>
          <span>
            Créez un projet gratuit sur{" "}
            <a
              href="https://supabase.com"
              target="_blank"
              rel="noreferrer"
              className="font-bold underline hover:text-amber-950"
            >
              supabase.com
            </a>
            .
          </span>
        </div>

        <div className="flex items-start gap-2">
          <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-amber-200 text-[11px] font-bold text-amber-900">
            2
          </span>
          <span>
            Dans <strong>SQL Editor</strong>, collez et exécutez le script <code>supabase/full_schema.sql</code>.
          </span>
        </div>

        <div className="flex items-start gap-2">
          <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-amber-200 text-[11px] font-bold text-amber-900">
            3
          </span>
          <span>
            Dans <strong>Auth &gt; Providers &gt; Email</strong>, décochez <strong>Confirm email</strong> (accès instantané en local).
          </span>
        </div>

        <div className="flex items-start gap-2">
          <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-amber-200 text-[11px] font-bold text-amber-900">
            4
          </span>
          <span>
            Créez le fichier <code>.env.local</code> avec vos clés et redémarrez <code>npm run dev</code>.
          </span>
        </div>
      </div>

      <div className="mt-3 rounded-xl bg-amber-900/10 p-2 font-mono text-[11px] text-amber-950 select-all overflow-x-auto">
        <code>
          NEXT_PUBLIC_SUPABASE_URL=https://votre-projet.supabase.co
          <br />
          NEXT_PUBLIC_SUPABASE_ANON_KEY=votre-cle-anon
          <br />
          NEXT_PUBLIC_SITE_URL=http://localhost:3000
        </code>
      </div>
    </div>
  );
}
