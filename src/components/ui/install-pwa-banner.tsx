"use client";

import { useEffect, useState } from "react";
import { Download, X, Share2, PlusSquare } from "lucide-react";
import { LogoIcon } from "@/components/ui/logo";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export function InstallPwaBanner() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isIos, setIsIos] = useState(false);
  const [showIosTip, setShowIosTip] = useState(false);
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    // Ne rien afficher si déjà installé ou lancé en mode autonome
    const isStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (navigator as unknown as { standalone?: boolean }).standalone === true;

    if (isStandalone) return;

    // Vérifier si déjà fermé dans la session
    if (sessionStorage.getItem("pwa_banner_dismissed")) return;

    // Détecter iOS Safari
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isAppleDevice = /iphone|ipad|ipod/.test(userAgent);
    setIsIos(isAppleDevice);

    setDismissed(false);

    // Écouter l'événement standard Chrome / Android / Edge
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstall);
    return () => window.removeEventListener("beforeinstallprompt", handleBeforeInstall);
  }, []);

  if (dismissed) return null;

  async function handleInstall() {
    if (deferredPrompt) {
      await deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      if (choice.outcome === "accepted") {
        setDismissed(true);
      }
      setDeferredPrompt(null);
    } else if (isIos) {
      setShowIosTip(true);
    }
  }

  function handleDismiss() {
    setDismissed(true);
    sessionStorage.setItem("pwa_banner_dismissed", "1");
  }

  return (
    <aside
      aria-label="Installation de l'application"
      className="fixed bottom-4 left-3 right-3 sm:left-auto sm:right-6 sm:max-w-md z-50 rounded-2xl border border-line bg-white/95 p-3.5 shadow-xl backdrop-blur-md transition-all animate-in fade-in slide-in-from-bottom-4 duration-300"
    >
      <div className="flex items-center gap-3">
        <LogoIcon className="size-10 shrink-0 rounded-xl" />
        <div className="flex-1 min-w-0">
          <p className="text-xs font-bold text-ink leading-tight">Installer Bon Waz à Dealer</p>
          <p className="text-[11px] text-muted truncate">Accédez à votre boutique en 1 clic sans navigateur</p>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={handleInstall}
            className="inline-flex items-center gap-1.5 rounded-xl bg-brand-600 px-3 py-1.5 text-xs font-bold text-white shadow-xs hover:bg-brand-700 active:scale-95 transition-all"
          >
            <Download className="size-3.5" aria-hidden />
            <span>Installer</span>
          </button>
          <button
            type="button"
            onClick={handleDismiss}
            className="p-1.5 text-muted hover:text-ink rounded-lg transition-colors"
            aria-label="Fermer"
          >
            <X className="size-4" />
          </button>
        </div>
      </div>

      {showIosTip && (
        <div className="mt-3 border-t border-line/60 pt-2.5 text-xs text-muted leading-relaxed">
          <p className="font-semibold text-ink mb-1">Pour installer sur iPhone :</p>
          <ol className="list-decimal list-inside space-y-1">
            <li className="flex items-center gap-1.5">
              <span>1. Appuyez sur le bouton Partager</span>
              <Share2 className="size-3.5 text-brand-600 inline shrink-0" aria-hidden />
            </li>
            <li className="flex items-center gap-1.5">
              <span>2. Choisissez &laquo;&nbsp;Sur l&apos;écran d&apos;accueil&nbsp;&raquo;</span>
              <PlusSquare className="size-3.5 text-brand-600 inline shrink-0" aria-hidden />
            </li>
          </ol>
        </div>
      )}
    </aside>
  );
}
