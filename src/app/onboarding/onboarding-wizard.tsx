"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, PartyPopper } from "lucide-react";
import { createShop, checkSlugAvailability } from "./actions";
import { slugify, slugProblem, SLUG_PROBLEM_MESSAGES } from "@/lib/slug";
import { DEFAULT_COUNTRY_CODE, isValidE164, toE164 } from "@/lib/phone";
import { Input } from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { PageSkeleton } from "@/components/ui/skeleton";
import { SlugField, type SlugStatus } from "@/components/shop/slug-field";
import { PhoneInput } from "@/components/shop/phone-input";
import { LogoUploader } from "@/components/shop/logo-uploader";

const DRAFT_KEY = "wo-onboarding-draft";

type Draft = { name: string; slug: string; slugTouched: boolean; countryCode: string; local: string };
const EMPTY: Draft = { name: "", slug: "", slugTouched: false, countryCode: DEFAULT_COUNTRY_CODE, local: "" };

type Props = { existingShop: { id: string; name: string } | null };

function OnboardingContent({ existingShop }: Props) {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2 | 3>(existingShop ? 3 : 1);
  const [draft, setDraft] = useState<Draft>(() => {
    // Reprise du brouillon si l'utilisateur a quitté en cours de route.
    try {
      const saved = localStorage.getItem(DRAFT_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        // Si le slug est vide ou correspond déjà au nom, on reconnecte la synchronisation
        const shouldSync = !parsed.slug || parsed.slug === slugify(parsed.name || "");
        return {
          ...EMPTY,
          ...parsed,
          slugTouched: shouldSync ? false : Boolean(parsed.slugTouched),
        };
      }
      return EMPTY;
    } catch {
      return EMPTY;
    }
  });
  const [slugStatus, setSlugStatus] = useState<SlugStatus>("idle");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [globalError, setGlobalError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    try {
      localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
    } catch {
      /* stockage indisponible (navigation privée) */
    }
  }, [draft]);

  const update = (patch: Partial<Draft>) => setDraft((d) => ({ ...d, ...patch }));

  function onNameChange(name: string) {
    const autoSlug = slugify(name);
    // Le lien suit automatiquement le nom de la boutique si :
    // - l'utilisateur n'a pas tapé de slug personnalisé distinct
    // - OU si le slug actuel est vide
    // - OU si le slug actuel correspondait déjà à l'ancien nom
    const shouldSyncSlug = !draft.slugTouched || !draft.slug || draft.slug === slugify(draft.name);

    update({
      name,
      slug: shouldSyncSlug ? autoSlug : draft.slug,
      slugTouched: shouldSyncSlug ? false : draft.slugTouched,
    });
    setErrors((e) => ({ ...e, name: "", slug: "" }));
  }

  async function nextFromStep1() {
    const cleanName = draft.name.trim();
    if (cleanName.length < 2) {
      setErrors({ name: "Le nom doit comporter au moins 2 caractères." });
      return;
    }

    const effectiveSlug = (draft.slug || slugify(cleanName)).trim();
    const problem = slugProblem(effectiveSlug);
    if (problem) {
      setErrors({ slug: SLUG_PROBLEM_MESSAGES[problem] });
      return;
    }

    if (effectiveSlug !== draft.slug) {
      update({ slug: effectiveSlug });
    }

    // Si déjà validé comme disponible
    if (slugStatus === "available" && draft.slug === effectiveSlug) {
      setErrors({});
      setStep(2);
      return;
    }

    // Vérification directe via server action pour ne jamais bloquer l'utilisateur
    setSaving(true);
    try {
      const res = await checkSlugAvailability(effectiveSlug);
      if (res.available) {
        setSlugStatus("available");
        setStep(2);
      } else {
        setSlugStatus("taken");
        setErrors({ slug: "Ce lien est déjà pris. Essayez une variante (ex. " + effectiveSlug + "-1)." });
      }
    } catch {
      setStep(2);
    } finally {
      setSaving(false);
    }
  }

  async function submitStep2() {
    const whatsapp = toE164(draft.countryCode, draft.local);
    if (!isValidE164(whatsapp)) {
      setErrors({ whatsapp_number: "Numéro invalide : vérifiez l'indicatif et le numéro." });
      return;
    }
    setErrors({});
    setGlobalError("");
    setSaving(true);
    try {
      const res = await createShop({ name: draft.name, slug: draft.slug, whatsapp_number: whatsapp });
      if (res.fieldErrors) {
        setErrors(res.fieldErrors);
        if (res.fieldErrors.slug || res.fieldErrors.name) setStep(1);
        return;
      }
      if (res.error) return setGlobalError(res.error);
      localStorage.removeItem(DRAFT_KEY);
      // Redirection directe vers le panneau des boutiques ou le tableau de bord
      router.replace("/boutiques");
      router.refresh();
    } catch {
      setGlobalError("Connexion impossible. Vérifiez votre réseau puis réessayez.");
    } finally {
      setSaving(false);
    }
  }

  function finish() {
    router.replace("/tableau-de-bord");
    router.refresh();
  }

  return (
    <div className="flex flex-1 flex-col">
      {/* Progression */}
      <div className="mb-6">
        <div className="mb-2 flex items-center justify-between text-sm font-semibold text-muted">
          <span>Étape {step} sur 3</span>
          {step === 2 && (
            <button type="button" onClick={() => setStep(1)} className="flex items-center gap-1 py-2 text-brand-700">
              <ArrowLeft className="size-4" aria-hidden /> Retour
            </button>
          )}
        </div>
        <div className="flex gap-1.5" aria-hidden>
          {[1, 2, 3].map((n) => (
            <span key={n} className={`h-1.5 flex-1 rounded-full ${n <= step ? "bg-brand-600" : "bg-line"}`} />
          ))}
        </div>
      </div>

      {globalError && (
        <div className="mb-4">
          <Alert tone="error">{globalError}</Alert>
        </div>
      )}

      {step === 1 && (
        <form
          className="flex flex-1 flex-col gap-5"
          onSubmit={(e) => {
            e.preventDefault();
            nextFromStep1();
          }}
        >
          <div>
            <h1 className="text-2xl font-extrabold">Comment s&apos;appelle votre boutique ?</h1>
            <p className="mt-1 text-muted">Vous pourrez le modifier plus tard.</p>
          </div>
          <Input
            label="Nom de la boutique"
            value={draft.name}
            onChange={(e) => onNameChange(e.target.value)}
            placeholder="Ex. Chez Awa Mode"
            autoComplete="organization"
            maxLength={60}
            autoFocus
            error={errors.name}
          />
          <SlugField
            value={draft.slug}
            onChange={(slug) => {
              const isBlank = slug.trim().length === 0;
              update({ slug, slugTouched: !isBlank });
              setErrors((e) => ({ ...e, slug: "" }));
            }}
            onStatusChange={setSlugStatus}
            error={errors.slug || undefined}
          />
          <div className="mt-auto pt-4">
            <Button type="submit" block>
              Continuer
            </Button>
          </div>
        </form>
      )}

      {step === 2 && (
        <form
          className="flex flex-1 flex-col gap-5"
          onSubmit={(e) => {
            e.preventDefault();
            submitStep2();
          }}
        >
          <div>
            <h1 className="text-2xl font-extrabold">Sur quel numéro recevoir vos commandes ?</h1>
            <p className="mt-1 text-muted">Vos clients vous enverront leur commande sur ce numéro WhatsApp.</p>
          </div>
          <PhoneInput
            countryCode={draft.countryCode}
            local={draft.local}
            onChange={(v) => {
              update(v);
              setErrors({});
            }}
            error={errors.whatsapp_number}
            hint="Saisissez le numéro tel que vous le composez localement."
          />
          <div className="mt-auto pt-4">
            <Button type="submit" block loading={saving}>
              {saving ? "Création de la boutique…" : "Créer ma boutique"}
            </Button>
          </div>
        </form>
      )}

      {step === 3 && (
        <div className="flex flex-1 flex-col gap-5">
          <div>
            <h1 className="flex items-center gap-2 text-2xl font-extrabold">
              Boutique créée <PartyPopper className="size-6 text-accent-500" aria-hidden />
            </h1>
            <p className="mt-1 text-muted">
              Ajoutez votre logo pour que vos clients vous reconnaissent (facultatif).
            </p>
          </div>
          <LogoUploader initialUrl={null} />
          <div className="mt-auto flex flex-col gap-2 pt-4">
            <Button type="button" block onClick={finish}>
              Terminer
            </Button>
            <Button type="button" variant="ghost" block onClick={finish}>
              Passer cette étape
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

// Rendu uniquement côté client (évite les erreurs d'hydratation liées aux
// extensions navigateur et à la lecture du brouillon dans localStorage).
export default dynamic(() => Promise.resolve(OnboardingContent), {
  ssr: false,
  loading: () => <PageSkeleton />,
});
