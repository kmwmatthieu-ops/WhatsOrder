"use client";

import { useState } from "react";
import { Plus, Trash2, Layers, Sparkles, Smartphone, Shirt, Footprints, Settings2, Check, ArrowRight } from "lucide-react";
import { Toggle } from "@/components/ui/toggle";
import { Button } from "@/components/ui/button";
import { formatFCFA } from "@/lib/format";
import type { ProductVariant } from "@/types/database";
import type { ProductVariantInput } from "@/lib/validation/product";

export type EditableVariant = {
  id?: string;
  label: string;
  attributes: Record<string, string>;
  price_override: number | null;
  stock: number | null;
  is_available: boolean;
};

type OptionGroup = {
  name: string;
  values: string;
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
      attributes: (v.attributes as Record<string, string>) || {},
      price_override: v.price_override,
      stock: v.stock,
      is_available: v.is_available,
    }))
  );

  // Groupes d'options pour le générateur superposé (ex: Ligne 1: Capacité, Ligne 2: Couleur)
  const [optionGroups, setOptionGroups] = useState<OptionGroup[]>([
    { name: "Capacité / Modèle", values: "64 Go, 128 Go, 256 Go" },
    { name: "Couleur", values: "Noir, Blanc, Bleu" },
  ]);

  const [defaultStockInput, setDefaultStockInput] = useState<string>("5");
  const [bulkStock, setBulkStock] = useState<string>("");
  const [bulkPrice, setBulkPrice] = useState<string>("");

  function syncParent(nextVariants: EditableVariant[], nextEnabled: boolean) {
    setVariants(nextVariants);
    setEnabled(nextEnabled);
    onChange(nextEnabled ? nextVariants : [], nextEnabled);
  }

  function handleToggleEnabled(checked: boolean) {
    syncParent(variants, checked);
  }

  // Appliquer un préréglage d'options en 1 clic
  function applyPreset(presetType: "phones" | "clothes" | "shoes") {
    if (presetType === "phones") {
      setOptionGroups([
        { name: "Capacité", values: "64 Go, 128 Go, 256 Go" },
        { name: "Couleur", values: "Noir, Blanc, Bleu, Or" },
      ]);
    } else if (presetType === "clothes") {
      setOptionGroups([
        { name: "Taille", values: "S, M, L, XL" },
        { name: "Couleur", values: "Noir, Blanc, Bleu, Rouge" },
      ]);
    } else if (presetType === "shoes") {
      setOptionGroups([
        { name: "Pointure", values: "40, 41, 42, 43, 44" },
        { name: "Couleur", values: "Noir, Blanc, Marron" },
      ]);
    }
  }

  function handleAddOptionGroup() {
    if (optionGroups.length >= 3) return;
    setOptionGroups((prev) => [...prev, { name: "", values: "" }]);
  }

  function handleRemoveOptionGroup(index: number) {
    setOptionGroups((prev) => prev.filter((_, i) => i !== index));
  }

  function handleUpdateOptionGroup(index: number, patch: Partial<OptionGroup>) {
    setOptionGroups((prev) =>
      prev.map((g, i) => (i === index ? { ...g, ...patch } : g))
    );
  }

  // Génération des combinaisons superposées
  function handleGenerateCombinations() {
    const validGroups = optionGroups
      .map((g) => ({
        name: g.name.trim() || "Option",
        values: splitList(g.values),
      }))
      .filter((g) => g.values.length > 0);

    if (validGroups.length === 0) return;

    // Produit cartésien de tous les groupes d'options
    let combinations: { attributes: Record<string, string>; parts: string[] }[] = [
      { attributes: {}, parts: [] },
    ];

    for (const group of validGroups) {
      const nextCombos: typeof combinations = [];
      for (const current of combinations) {
        for (const val of group.values) {
          nextCombos.push({
            attributes: { ...current.attributes, [group.name]: val },
            parts: [...current.parts, val],
          });
        }
      }
      combinations = nextCombos;
    }

    const parsedDefaultStock =
      defaultStockInput.trim() === "" ? null : Math.max(0, parseInt(defaultStockInput, 10) || 0);

    const existingLabels = new Set(variants.map((v) => v.label.trim().toLowerCase()));
    const added: EditableVariant[] = [];

    for (const combo of combinations) {
      const label = combo.parts.join(" / ");
      const key = label.toLowerCase();
      if (existingLabels.has(key)) continue;
      existingLabels.add(key);

      added.push({
        label,
        attributes: combo.attributes,
        price_override: null,
        stock: parsedDefaultStock,
        is_available: true,
      });
    }

    if (added.length > 0) {
      syncParent([...variants, ...added], true);
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

  function handleClearAll() {
    if (variants.length === 0) return;
    if (confirm("Supprimer toutes les variantes configurées ?")) {
      syncParent([], enabled);
    }
  }

  // Appliquer le stock en masse
  function handleApplyBulkStock() {
    const val = bulkStock.trim() === "" ? null : Math.max(0, parseInt(bulkStock, 10) || 0);
    const next = variants.map((v) => ({ ...v, stock: val }));
    syncParent(next, enabled);
    setBulkStock("");
  }

  // Appliquer le prix en masse
  function handleApplyBulkPrice() {
    const val = bulkPrice.trim() === "" ? null : Math.max(1, parseInt(bulkPrice, 10) || 0);
    const next = variants.map((v) => ({ ...v, price_override: val }));
    syncParent(next, enabled);
    setBulkPrice("");
  }

  return (
    <section className="rounded-3xl border border-line bg-white p-5 shadow-sm flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <Layers className="size-5 text-brand-600 shrink-0" aria-hidden />
        <h2 className="text-base font-bold text-ink">Variantes superposées (Capacité, Couleur, Taille…)</h2>
      </div>

      <Toggle
        checked={enabled}
        onChange={handleToggleEnabled}
        name="has_variants"
        label="Activer les variantes pour ce produit"
        description="Idéal pour les téléphones (ex: 64 Go, 128 Go + Couleurs) ou vêtements (Taille + Couleur) avec stocks et prix indépendants."
      />

      {enabled && (
        <div className="flex flex-col gap-5 border-t border-line pt-4">
          {/* Boîte : Créateur d'options superposées */}
          <div className="rounded-2xl border border-brand-100 bg-brand-50/40 p-4 flex flex-col gap-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 text-xs font-extrabold text-brand-800">
                <Sparkles className="size-4 text-brand-600 shrink-0" />
                <span>Définir vos lignes de variantes superposées</span>
              </div>

              {/* Raccourcis de modèles prédéfinis */}
              <div className="flex flex-wrap items-center gap-1 text-[11px]">
                <span className="text-muted mr-1">Exemples rapides :</span>
                <button
                  type="button"
                  onClick={() => applyPreset("phones")}
                  className="inline-flex items-center gap-1 rounded-lg border border-line bg-white px-2 py-0.5 font-bold text-ink hover:bg-sand transition-colors"
                >
                  <Smartphone className="size-3 text-brand-600" />
                  <span>Téléphonie</span>
                </button>
                <button
                  type="button"
                  onClick={() => applyPreset("clothes")}
                  className="inline-flex items-center gap-1 rounded-lg border border-line bg-white px-2 py-0.5 font-bold text-ink hover:bg-sand transition-colors"
                >
                  <Shirt className="size-3 text-brand-600" />
                  <span>Vêtements</span>
                </button>
                <button
                  type="button"
                  onClick={() => applyPreset("shoes")}
                  className="inline-flex items-center gap-1 rounded-lg border border-line bg-white px-2 py-0.5 font-bold text-ink hover:bg-sand transition-colors"
                >
                  <Footprints className="size-3 text-brand-600" />
                  <span>Chaussures</span>
                </button>
              </div>
            </div>

            <p className="text-[11px] text-muted leading-relaxed">
              Ajoutez vos lignes d&apos;options (ex: <strong>Capacité</strong>, <strong>Couleur</strong> ou <strong>Taille</strong>). Séparez chaque valeur par une virgule. Le générateur créera les combinaisons complètes que vous pourrez ensuite ajuster ligne par ligne.
            </p>

            {/* Liste des groupes d'options */}
            <div className="flex flex-col gap-2.5">
              {optionGroups.map((group, idx) => (
                <div
                  key={idx}
                  className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-center rounded-xl bg-white border border-line/80 p-2.5 shadow-2xs"
                >
                  <div className="sm:col-span-4">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-muted block mb-1">
                      Nom de la ligne #{idx + 1}
                    </label>
                    <input
                      type="text"
                      value={group.name}
                      onChange={(e) => handleUpdateOptionGroup(idx, { name: e.target.value })}
                      placeholder="Ex: Capacité, Couleur, Taille..."
                      className="h-9 w-full rounded-lg border border-line px-2.5 text-xs font-bold text-ink outline-none focus:border-brand-600"
                    />
                  </div>

                  <div className="sm:col-span-7">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-muted block mb-1">
                      Valeurs disponibles (séparées par des virgules)
                    </label>
                    <input
                      type="text"
                      value={group.values}
                      onChange={(e) => handleUpdateOptionGroup(idx, { values: e.target.value })}
                      placeholder="Ex: 64 Go, 128 Go, 256 Go ou Noir, Blanc, Or"
                      className="h-9 w-full rounded-lg border border-line px-2.5 text-xs font-semibold text-ink outline-none focus:border-brand-600"
                    />
                  </div>

                  <div className="sm:col-span-1 flex justify-end">
                    {optionGroups.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveOptionGroup(idx)}
                        className="grid size-8 place-items-center rounded-lg text-danger-600 hover:bg-danger-50 transition-colors"
                        title="Supprimer cette ligne d'option"
                      >
                        <Trash2 className="size-4" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Actions du générateur */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 border-t border-brand-100">
              <div className="flex items-center gap-2">
                {optionGroups.length < 3 && (
                  <button
                    type="button"
                    onClick={handleAddOptionGroup}
                    className="inline-flex items-center gap-1 text-xs font-bold text-brand-700 hover:underline"
                  >
                    <Plus className="size-3.5" />
                    <span>Ajouter une autre ligne d&apos;option</span>
                  </button>
                )}
                <div className="flex items-center gap-1.5 ml-auto sm:ml-4 text-[11px] text-muted">
                  <span>Stock par défaut :</span>
                  <input
                    type="number"
                    min={0}
                    value={defaultStockInput}
                    onChange={(e) => setDefaultStockInput(e.target.value)}
                    placeholder="Illimité"
                    className="h-7 w-16 rounded-md border border-line bg-white px-2 text-xs font-bold text-ink outline-none focus:border-brand-600"
                  />
                </div>
              </div>

              <Button
                type="button"
                size="sm"
                onClick={handleGenerateCombinations}
                disabled={optionGroups.every((g) => !g.values.trim())}
              >
                <Sparkles className="size-3.5" />
                <span>Générer les combinaisons</span>
              </Button>
            </div>
          </div>

          {/* En-tête des variantes configurées */}
          <div className="flex flex-col gap-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-muted">
                  Variantes actives ({variants.length})
                </span>
                <p className="text-[11px] text-muted">
                  Chaque ligne représente une combinaison exacte disponible pour vos clients.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleAddEmptyRow}
                  className="inline-flex items-center gap-1 rounded-xl border border-brand-600 bg-brand-50/50 px-3 py-1.5 text-xs font-bold text-brand-700 hover:bg-brand-100 transition-colors cursor-pointer"
                >
                  <Plus className="size-3.5" />
                  <span>+ Ajouter une variante manuelle</span>
                </button>
                {variants.length > 0 && (
                  <button
                    type="button"
                    onClick={handleClearAll}
                    className="text-xs font-semibold text-danger-600 hover:underline px-2 py-1"
                  >
                    Tout effacer
                  </button>
                )}
              </div>
            </div>

            {/* Outils d'application en masse pour aller vite */}
            {variants.length > 1 && (
              <div className="rounded-xl border border-line bg-sand/30 p-2.5 flex flex-wrap items-center gap-3 text-xs">
                <span className="font-bold text-ink text-[11px] uppercase tracking-wider">
                  ⚡ Actions rapides :
                </span>
                <div className="flex items-center gap-1.5">
                  <span className="text-muted">Stock pour tous :</span>
                  <input
                    type="number"
                    min={0}
                    value={bulkStock}
                    onChange={(e) => setBulkStock(e.target.value)}
                    placeholder="Ex: 10"
                    className="h-7 w-20 rounded-lg border border-line bg-white px-2 text-xs font-bold text-ink outline-none"
                  />
                  <button
                    type="button"
                    onClick={handleApplyBulkStock}
                    className="rounded-lg bg-ink px-2.5 py-1 text-[11px] font-bold text-white hover:bg-ink/80 transition-colors"
                  >
                    Appliquer
                  </button>
                </div>

                <div className="flex items-center gap-1.5">
                  <span className="text-muted">Prix pour tous :</span>
                  <input
                    type="number"
                    min={1}
                    value={bulkPrice}
                    onChange={(e) => setBulkPrice(e.target.value)}
                    placeholder="Ex: 150000"
                    className="h-7 w-24 rounded-lg border border-line bg-white px-2 text-xs font-bold text-ink outline-none"
                  />
                  <button
                    type="button"
                    onClick={handleApplyBulkPrice}
                    className="rounded-lg bg-ink px-2.5 py-1 text-[11px] font-bold text-white hover:bg-ink/80 transition-colors"
                  >
                    Appliquer
                  </button>
                </div>
              </div>
            )}

            {variants.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-line bg-sand/30 p-6 text-center text-xs text-muted flex flex-col items-center gap-2">
                <Layers className="size-8 text-muted/50" />
                <p className="font-semibold text-ink">Aucune variante enregistrée</p>
                <p>
                  Utilisez le générateur d&apos;options ci-dessus ou cliquez sur{" "}
                  <strong>« + Ajouter une variante manuelle »</strong> pour créer vos modèles.
                </p>
              </div>
            ) : (
              <div className="flex flex-col gap-2.5">
                {variants.map((variant, idx) => {
                  const isOut = variant.stock === 0 || !variant.is_available;
                  const attrEntries = Object.entries(variant.attributes);

                  return (
                    <div
                      key={variant.id ?? `new-${idx}`}
                      className={`rounded-2xl border p-3 sm:p-3.5 flex flex-col gap-2.5 transition-colors ${
                        isOut ? "border-rose-200 bg-rose-50/30" : "border-line bg-white shadow-2xs"
                      }`}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div className="flex-1">
                          <label className="text-[10px] font-bold uppercase tracking-wider text-muted block mb-1">
                            Libellé de la variante (Visible par le client)
                          </label>
                          <input
                            type="text"
                            value={variant.label}
                            onChange={(e) => {
                              const newLabel = e.target.value;
                              // Si l'utilisateur édite manuellement le label avec des slashes, mettre à jour les attributs
                              const parts = newLabel.split(" / ").map((p) => p.trim()).filter(Boolean);
                              const newAttrs: Record<string, string> = { ...variant.attributes };
                              if (parts.length >= 2 && attrEntries.length <= 1) {
                                newAttrs["Modèle"] = parts[0];
                                newAttrs["Option"] = parts[1];
                              }
                              handleUpdateRow(idx, { label: newLabel, attributes: newAttrs });
                            }}
                            placeholder="Ex: 128 Go / Noir ou Taille L / Blanc"
                            maxLength={120}
                            required
                            className="h-9 w-full rounded-xl border border-line bg-white px-3 text-xs sm:text-sm font-bold text-ink outline-none focus:border-brand-600"
                          />
                        </div>

                        {/* Badges d'attributs décomposés */}
                        {attrEntries.length > 0 && (
                          <div className="flex flex-wrap items-center gap-1.5 self-start sm:self-end sm:mb-1">
                            {attrEntries.map(([k, val]) => (
                              <span
                                key={k}
                                className="rounded-lg bg-brand-50 border border-brand-100 px-2 py-0.5 text-[10px] font-bold text-brand-800"
                              >
                                {k}: {val}
                              </span>
                            ))}
                          </div>
                        )}

                        <button
                          type="button"
                          onClick={() => handleRemoveRow(idx)}
                          className="grid size-8 shrink-0 place-items-center rounded-lg text-danger-600 hover:bg-danger-50 transition-colors self-end sm:self-center"
                          aria-label="Supprimer cette variante"
                          title="Supprimer cette variante"
                        >
                          <Trash2 className="size-4" />
                        </button>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 items-end pt-1 border-t border-line/60">
                        {/* Stock de la variante */}
                        <div>
                          <label className="text-[10px] font-bold uppercase tracking-wider text-muted block mb-1">
                            Stock disponible
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
                            Prix de cette variante (FCFA)
                          </label>
                          <input
                            type="number"
                            min={1}
                            step={1}
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
                                : "Prix de base"
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
                            className={`inline-flex h-9 w-full sm:w-auto items-center justify-center rounded-xl px-3 text-xs font-bold border transition-colors cursor-pointer ${
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
