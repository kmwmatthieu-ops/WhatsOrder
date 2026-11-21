"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
import { ArrowLeft, PartyPopper, Check } from "lucide-react";
import {
  createShop,
  checkSlugAvailability,
  completeOnboardingDesign,
} from "./actions";
import { slugify, slugProblem, SLUG_PROBLEM_MESSAGES } from "@/lib/slug";
import { DEFAULT_COUNTRY_CODE, isValidE164, toE164 } from "@/lib/phone";
import { DEFAULT_SHOP_COLOR, SHOP_COLOR_PRESETS } from "@/lib/constants";
import { Input } from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { PageSkeleton } from "@/components/ui/skeleton";
import { SlugField, type SlugStatus } from "@/components/shop/slug-field";
import { PhoneInput } from "@/components/shop/phone-input";
import { LogoUploader } from "@/components/shop/logo-uploader";

const DRAFT_KEY = "wo-onboarding-draft";
const IN_PROGRESS_KEY = "wo-onboarding-in-progress";

type Draft = { name: string; slug: string; slugTouched: boolean; countryCode: string; local: string };
const EMPTY: Draft = { name: "", slug: "", slugTouched: false, countryCode: DEFAULT_COUNTRY_CODE, local: "" };

type Props = {
  existingShop: {
    id: string;
    name: string;
    logo_url?: string | null;
    primary_color?: string | null;
  } | null;
};

function OnboardingContent({ existingShop }: Props) {
  // Détermine si l'utilisateur est en train de créer sa boutique (étape 1 -> 2 -> 3)
  // ou s'il avait déjà terminé sa création dans le passé.
  const isCreatingFlowRef = useRef<boolean | null>(null);
  if (isCreatingFlowRef.current === null) {
    let inProgressFlag = false;
    try {
      inProgressFlag = sessionStorage.getItem(IN_PROGRESS_KEY) === "1";
    } catch {
      /* ignore */
    }
    if (!existingShop) {
      isCreatingFlowRef.current = true;
      try {
        sessionStorage.setItem(IN_PROGRESS_KEY, "1");
      } catch {
        /* ignore */
      }
    } else if (inProgressFlag) {
      // L'utilisateur vient de passer l'étape 2 (ou son navigateur mobile a rechargé pendant le choix photo à l'étape 3)
      isCreatingFlowRef.current = true;
    } else {
      isCreatingFlowRef.current = false;
    }
  }

  const [step, setStep] = useState<1 | 2 | 3>(() => {
    if (existingShop && isCreatingFlowRef.current) return 3;
    return 1;
  });
  const [selectedColor, setSelectedColor] = useState<string>(
    existingShop?.primary_color || DEFAULT_SHOP_COLOR
  );
  const [finishing, setFinishing] = useState(false);

  const [draft, setDraft] = useState<Draft>(() => {
    try {
      const saved = localStorage.getItem(DRAFT_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
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

  // Uniquement si le compte possédait DÉJÀ une boutique avant d'entrer sur /onboarding,
  // on le renvoie vers le panneau « Vos boutiques ».
  useEffect(() => {
    if (isCreatingFlowRef.current === false && existingShop) {
      window.location.replace("/boutiques");
    }
  }, [existingShop]);

  useEffect(() => {
    try {
      localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
    } catch {
      /* stockage indisponible */
    }
  }, [draft]);

  if (isCreatingFlowRef.current === false && existingShop) {
    return <PageSkeleton />;
  }

  const update = (patch: Partial<Draft>) => setDraft((d) => ({ ...d, ...patch }));

  function onNameChange(name: string) {
    const autoSlug = slugify(name);
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

    if (slugStatus === "available" && draft.slug === effectiveSlug) {
      setErrors({});
      setStep(2);
      return;
    }

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
      try {
        sessionStorage.setItem(IN_PROGRESS_KEY, "1");
      } catch {
        /* ignore */
      }
      const res = await createShop({ name: draft.name, slug: draft.slug, whatsapp_number: whatsapp });
      if (res.fieldErrors) {
        setErrors(res.fieldErrors);
        if (res.fieldErrors.slug || res.fieldErrors.name) setStep(1);
        return;
      }
      if (res.error) {
        setGlobalError(res.error);
        return;
      }
      try {
        localStorage.removeItem(DRAFT_KEY);
      } catch {
        /* ignore */
      }
      // Passe systématiquement à l'étape 3 (Design de la boutique : photo de profil & couleur)
      setStep(3);
    } catch {
      setGlobalError("Connexion impossible. Vérifiez votre réseau puis réessayez.");
    } finally {
      setSaving(false);
    }
  }

  async function finish() {
    if (finishing) return;
    setFinishing(true);
    try {
      await completeOnboardingDesign(selectedColor);
    } catch {
      /* ignore */
    }
    try {
      sessionStorage.removeItem(IN_PROGRESS_KEY);
      localStorage.removeItem(DRAFT_KEY);
    } catch {
      /* ignore */
    }
    // Une fois toutes les étapes validées, accès direct à la boutique créée
    window.location.replace("/tableau-de-bord");
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
            <Button type="submit" block loading={saving}>
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
              {saving ? " Enregistrement…" : "Continuer vers le design"}
            </Button>
          </div>
        </form>
      )}

      {step === 3 && (
        <div className="flex flex-1 flex-col gap-6">
          <div>
            <h1 className="flex items-center gap-2 text-2xl font-extrabold">
              Design de votre boutique <PartyPopper className="size-6 text-accent-500" aria-hidden />
            </h1>
            <p className="mt-1 text-sm text-muted">
              Personnalisez votre photo de profil (logo) et la couleur principale de votre vitrine avant d&apos;entrer dans votre boutique.
            </p>
          </div>

          <div className="rounded-3xl border border-line bg-white p-5 shadow-xs flex flex-col gap-5">
            <div>
              <label className="text-sm font-bold text-ink mb-2 block">
                Photo de profil / Logo <span className="font-normal text-muted">(facultatif)</span>
              </label>
              <LogoUploader initialUrl={existingShop?.logo_url ?? null} />
            </div>

            <div className="border-t border-line pt-4">
              <label className="text-sm font-bold text-ink mb-1 block">
                Couleur principale de la boutique
              </label>
              <p className="text-xs text-muted mb-3">
                Utilisée pour vos boutons d&apos;achat et les accents de votre catalogue.
              </p>
              <div className="flex flex-wrap items-center gap-2.5">
                {SHOP_COLOR_PRESETS.map((preset) => {
                  const isSelected = selectedColor.toLowerCase() === preset.toLowerCase();
                  return (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setSelectedColor(preset)}
                      style={{ backgroundColor: preset }}
                      className={`grid size-9 place-items-center rounded-full text-white transition-transform ${
                        isSelected
                          ? "ring-4 ring-brand-100 scale-110 shadow-sm"
                          : "hover:scale-105"
                      }`}
                      aria-label={`Couleur ${preset}`}
                    >
                      {isSelected && <Check className="size-4 stroke-[3]" />}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="mt-auto flex flex-col gap-2 pt-4">
            <Button type="button" block loading={finishing} onClick={finish}>
              {finishing ? "Ouverture de votre boutique…" : "Valider et accéder à ma boutique"}
            </Button>
            <Button type="button" variant="ghost" block disabled={finishing} onClick={finish}>
              Passer cette étape
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

export default dynamic(() => Promise.resolve(OnboardingContent), {
  ssr: false,
  loading: () => <PageSkeleton />,
});
