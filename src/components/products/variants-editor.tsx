"use client";

import { useState } from "react";
import { Plus, Trash2, Layers, Sparkles } from "lucide-react";
import { Toggle } from "@/components/ui/toggle";
import { Button } from "@/components/ui/button";
import { formatFCFA } from "@/lib/format";
import type { ProductVariant } from "@/types/database";
import type { ProductVariantInput } from "@/lib/validation/product";

export type EditableVariant = {
  id?: string;
  label: string;
  attributes: {
    taille?: string;
    couleur?: string;
    modele?: string;
  };
  price_override: number | null;
  stock: number | null;
  is_available: boolean;
};

type Props = {
  initialVariants?: ProductVariant[];
  basePrice?: number;
  onChange: (variants: ProductVariantInput[], enabled: boolean) => void;
};

function splitList(raw: string): string[] {
  return raw
    .split(/[,;/]+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

export function VariantsEditor({ initialVariants = [], basePrice, onChange }: Props) {
  const [enabled, setEnabled] = useState<boolean>(initialVariants.length > 0);
  const [variants, setVariants] = useState<EditableVariant[]>(() =>
    initialVariants.map((v) => ({
      id: v.id,
      label: v.label,
      attributes: (v.attributes as EditableVariant["attributes"]) || {},
      price_override: v.price_override,
      stock: v.stock,
      is_available: v.is_available,
    }))
  );

  // Champs du générateur rapide par axes (Taille, Couleur, Modèle)
  const [taillesInput, setTaillesInput] = useState("");
  const [couleursInput, setCouleursInput] = useState("");
  const [modelesInput, setModelesInput] = useState("");
  const [defaultStockInput, setDefaultStockInput] = useState<string>("5");

  function syncParent(nextVariants: EditableVariant[], nextEnabled: boolean) {
    setVariants(nextVariants);
    setEnabled(nextEnabled);
    onChange(nextEnabled ? nextVariants : [], nextEnabled);
  }

  function handleToggleEnabled(checked: boolean) {
    syncParent(variants, checked);
  }

  function handleGenerateCombinations() {
    const tailles = splitList(taillesInput);
    const couleurs = splitList(couleursInput);
    const modeles = splitList(modelesInput);

    if (tailles.length === 0 && couleurs.length === 0 && modeles.length === 0) {
      return;
    }

    const tList = tailles.length > 0 ? tailles : [""];
    const cList = couleurs.length > 0 ? couleurs : [""];
    const mList = modeles.length > 0 ? modeles : [""];

    const parsedDefaultStock =
      defaultStockInput.trim() === "" ? null : Math.max(0, parseInt(defaultStockInput, 10) || 0);

    const existingLabels = new Set(variants.map((v) => v.label.trim().toLowerCase()));
    const added: EditableVariant[] = [];

    for (const t of tList) {
      for (const c of cList) {
        for (const m of mList) {
          const parts = [t, c, m].filter(Boolean);
          if (parts.length === 0) continue;
          const label = parts.join(" / ");
          const key = label.toLowerCase();
          if (existingLabels.has(key)) continue;
          existingLabels.add(key);

          added.push({
            label,
            attributes: {
              ...(t ? { taille: t } : {}),
              ...(c ? { couleur: c } : {}),
              ...(m ? { modele: m } : {}),
            },
            price_override: null,
            stock: parsedDefaultStock,
            is_available: true,
          });
        }
      }
    }

    if (added.length > 0) {
      syncParent([...variants, ...added], true);
      setTaillesInput("");
      setCouleursInput("");
      setModelesInput("");
    }
  }

  function handleAddEmptyRow() {
    syncParent(
      [
        ...variants,
        {
          label: "",
          attributes: {},
          price_override: null,
          stock: 1,
          is_available: true,
        },
      ],
      true
    );
  }

  function handleUpdateRow(index: number, patch: Partial<EditableVariant>) {
    const next = variants.map((v, i) => (i === index ? { ...v, ...patch } : v));
    syncParent(next, enabled);
  }

  function handleRemoveRow(index: number) {
    const next = variants.filter((_, i) => i !== index);
    syncParent(next, enabled);
  }

  return (
    <section className="rounded-3xl border border-line bg-white p-5 shadow-sm flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <Layers className="size-5 text-brand-600 shrink-0" aria-hidden />
        <h2 className="text-base font-bold text-ink">Variantes (Taille, Couleur, Modèle)</h2>
      </div>

      <Toggle
        checked={enabled}
        onChange={handleToggleEnabled}
        name="has_variants"
        label="Activer les variantes pour ce produit"
        description="Définissez un stock et éventuellement un prix différent pour chaque combinaison (taille, couleur, modèle)."
      />

      {enabled && (
        <div className="flex flex-col gap-5 border-t border-line pt-4">
          {/* Générateur rapide de combinaisons */}
          <div className="rounded-2xl border border-brand-100 bg-brand-50/40 p-4 flex flex-col gap-3">
            <div className="flex items-center gap-1.5 text-xs font-extrabold text-brand-800">
              <Sparkles className="size-4 text-brand-600 shrink-0" />
              <span>Générateur rapide de combinaisons</span>
            </div>
            <p className="text-[11px] text-muted leading-relaxed">
              Séparez vos valeurs par une virgule (ex. Tailles : <strong>S, M, L</strong> et Couleurs : <strong>Noir, Blanc</strong>) pour créer toutes les combinaisons en 1 clic.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              <div>
                <label className="text-[11px] font-bold text-ink block mb-1">Taille(s)</label>
                <input
                  type="text"
                  value={taillesInput}
                  onChange={(e) => setTaillesInput(e.target.value)}
                  placeholder="Ex: S, M, L ou 41, 42"
                  className="h-10 w-full rounded-xl border border-line bg-white px-3 text-xs font-semibold text-ink outline-none focus:border-brand-600"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-ink block mb-1">Couleur(s)</label>
                <input
                  type="text"
                  value={couleursInput}
                  onChange={(e) => setCouleursInput(e.target.value)}
                  placeholder="Ex: Noir, Blanc, Or"
                  className="h-10 w-full rounded-xl border border-line bg-white px-3 text-xs font-semibold text-ink outline-none focus:border-brand-600"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-ink block mb-1">Modèle(s)</label>
                <input
                  type="text"
                  value={modelesInput}
                  onChange={(e) => setModelesInput(e.target.value)}
                  placeholder="Ex: 128 Go, 256 Go"
                  className="h-10 w-full rounded-xl border border-line bg-white px-3 text-xs font-semibold text-ink outline-none focus:border-brand-600"
                />
              </div>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pt-1">
              <div className="flex items-center gap-2">
                <label className="text-[11px] font-semibold text-muted shrink-0">
                  Stock initial par variante :
                </label>
                <input
                  type="number"
                  min={0}
                  value={defaultStockInput}
                  onChange={(e) => setDefaultStockInput(e.target.value)}
                  placeholder="Illimité"
                  className="h-8 w-20 rounded-lg border border-line bg-white px-2 text-xs font-bold text-ink outline-none focus:border-brand-600"
                />
              </div>

              <Button
                type="button"
                size="sm"
                onClick={handleGenerateCombinations}
                disabled={!taillesInput.trim() && !couleursInput.trim() && !modelesInput.trim()}
              >
                <Plus className="size-4" />
                <span>Générer les variantes</span>
              </Button>
            </div>
          </div>

          {/* Liste des variantes créées */}
          <div className="flex flex-col gap-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-muted">
                Combinaisons configurées ({variants.length})
              </span>
              <button
                type="button"
                onClick={handleAddEmptyRow}
                className="inline-flex items-center gap-1 text-xs font-bold text-brand-700 hover:underline"
              >
                <Plus className="size-3.5" />
                <span>Ajouter une variante manuelle</span>
              </button>
            </div>

            {variants.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-line bg-sand/30 p-5 text-center text-xs text-muted">
                Aucune variante ajoutée. Utilisez le générateur ci-dessus ou cliquez sur &laquo;&nbsp;Ajouter une variante manuelle&nbsp;&raquo;.
              </div>
            ) : (
              <div className="flex flex-col gap-2.5">
                {variants.map((variant, idx) => {
                  const isOut = variant.stock === 0 || !variant.is_available;
                  return (
                    <div
                      key={variant.id ?? `new-${idx}`}
                      className={`rounded-2xl border p-3.5 flex flex-col gap-3 transition-colors ${
                        isOut ? "border-rose-200 bg-rose-50/30" : "border-line bg-white shadow-2xs"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex-1">
                          <label className="text-[10px] font-bold uppercase tracking-wider text-muted block mb-1">
                            Combinaison (Taille / Couleur / Modèle)
                          </label>
                          <input
                            type="text"
                            value={variant.label}
                            onChange={(e) => handleUpdateRow(idx, { label: e.target.value })}
                            placeholder="Ex: Taille L / Noir"
                            maxLength={120}
                            required
                            className="h-9 w-full rounded-xl border border-line bg-white px-3 text-xs sm:text-sm font-bold text-ink outline-none focus:border-brand-600"
                          />
                        </div>

                        <button
                          type="button"
                          onClick={() => handleRemoveRow(idx)}
                          className="mt-4 grid size-9 shrink-0 place-items-center rounded-xl text-danger-600 hover:bg-danger-50 transition-colors"
                          aria-label="Supprimer cette variante"
                          title="Supprimer cette variante"
                        >
                          <Trash2 className="size-4" />
                        </button>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 items-end">
                        {/* Stock de la variante */}
                        <div>
                          <label className="text-[10px] font-bold uppercase tracking-wider text-muted block mb-1">
                            Stock (vide = illimité)
                          </label>
                          <input
                            type="number"
                            min={0}
                            step={1}
                            value={variant.stock === null ? "" : variant.stock}
                            onChange={(e) => {
                              const raw = e.target.value;
                              handleUpdateRow(idx, {
                                stock: raw === "" ? null : Math.max(0, parseInt(raw, 10) || 0),
                              });
                            }}
                            placeholder="Illimité"
                            className="h-9 w-full rounded-xl border border-line bg-white px-3 text-xs font-bold text-ink outline-none focus:border-brand-600"
                          />
                        </div>

                        {/* Prix spécifique optionnel */}
                        <div>
                          <label className="text-[10px] font-bold uppercase tracking-wider text-muted block mb-1">
                            Prix spécifique (FCFA)
                          </label>
                          <input
                            type="number"
                            min={1}
                            step={50}
                            value={variant.price_override === null ? "" : variant.price_override}
                            onChange={(e) => {
                              const raw = e.target.value;
                              handleUpdateRow(idx, {
                                price_override:
                                  raw === "" ? null : Math.max(1, parseInt(raw, 10) || 0),
                              });
                            }}
                            placeholder={
                              basePrice && basePrice > 0
                                ? `Par défaut (${formatFCFA(basePrice)})`
                                : "Même prix"
                            }
                            className="h-9 w-full rounded-xl border border-line bg-white px-3 text-xs font-bold text-ink outline-none focus:border-brand-600"
                          />
                        </div>

                        {/* État disponible / épuisé */}
                        <div className="col-span-2 sm:col-span-1 flex items-center justify-between sm:justify-end gap-2 pt-1 sm:pt-0">
                          <button
                            type="button"
                            onClick={() =>
                              handleUpdateRow(idx, { is_available: !variant.is_available })
                            }
                            className={`inline-flex h-9 items-center justify-center rounded-xl px-3 text-xs font-bold border transition-colors ${
                              !isOut
                                ? "bg-success-50 text-success-700 border-success-200"
                                : "bg-rose-50 text-rose-700 border-rose-200"
                            }`}
                          >
                            {variant.stock === 0
                              ? "Stock à 0 (Épuisé)"
                              : variant.is_available
                                ? "Disponible"
                                : "Désactivée"}
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
