"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Trash2 } from "lucide-react";
import { Input, Textarea, Select } from "@/components/ui/field";
import { Toggle } from "@/components/ui/toggle";
import { SubmitButton } from "@/components/ui/submit-button";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { ImagePicker } from "./image-picker";
import { initialActionState, type ActionState } from "@/lib/action-state";
import type { Category, Product } from "@/types/database";

type Props = {
  product?: Product;
  categories: Category[];
  action: (_prev: ActionState, formData: FormData) => Promise<ActionState>;
  onDelete?: () => Promise<{ error?: string }>;
};

export function ProductForm({ product, categories, action, onDelete }: Props) {
  const [state, formAction] = useActionState(action, initialActionState);
  
  const [images, setImages] = useState<string[]>(product?.images ?? []);
  const [hasStock, setHasStock] = useState(product ? product.stock !== null : false);
  const [isAvailable, setIsAvailable] = useState(product ? product.is_available : true);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  async function handleDelete() {
    if (!onDelete || !confirm("Voulez-vous vraiment supprimer définitivement ce produit ?")) return;
    setDeleting(true);
    setDeleteError("");
    const res = await onDelete();
    setDeleting(false);
    if (res.error) setDeleteError(res.error);
  }

  return (
    <form action={formAction} className="flex flex-col gap-6" noValidate>
      <div className="flex items-center justify-between">
        <Link
          href="/tableau-de-bord/produits"
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-brand-700 hover:underline"
        >
          <ArrowLeft className="size-4" />
          Retour aux produits
        </Link>

        {product && onDelete && (
          <Button
            type="button"
            variant="danger"
            size="sm"
            onClick={handleDelete}
            loading={deleting}
          >
            <Trash2 className="size-4" />
            Supprimer
          </Button>
        )}
      </div>

      {deleteError && <Alert tone="error">{deleteError}</Alert>}
      {state.error && <Alert tone="error">{state.error}</Alert>}

      {/* Photos */}
      <section className="rounded-3xl border border-line bg-white p-5 shadow-sm">
        <ImagePicker
          images={images}
          onChange={setImages}
          error={state.fieldErrors?.images}
        />
        <input type="hidden" name="images_json" value={JSON.stringify(images)} />
      </section>

      {/* Informations générales */}
      <section className="rounded-3xl border border-line bg-white p-5 shadow-sm flex flex-col gap-4">
        <h2 className="text-base font-bold text-ink">Informations principales</h2>

        <Input
          label="Nom du produit"
          name="name"
          defaultValue={product?.name ?? ""}
          placeholder="Ex. Robe d'été fleurie"
          maxLength={80}
          required
          error={state.fieldErrors?.name}
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label="Prix (FCFA)"
            name="price"
            type="number"
            min={1}
            step={50}
            defaultValue={product?.price ?? ""}
            placeholder="Ex. 15000"
            required
            hint="Montant entier, sans virgule."
            error={state.fieldErrors?.price}
          />

          <Select
            label="Catégorie"
            name="category_id"
            defaultValue={product?.category_id ?? ""}
            optional
            error={state.fieldErrors?.category_id}
          >
            <option value="">Aucune catégorie</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
        </div>

        <Textarea
          label="Description détaillée"
          name="description"
          defaultValue={product?.description ?? ""}
          maxLength={1000}
          optional
          placeholder="Matière, caractéristiques, conseils d'utilisation…"
          error={state.fieldErrors?.description}
        />

        <Input
          label="Options disponibles"
          name="options_text"
          defaultValue={product?.options_text ?? ""}
          maxLength={300}
          optional
          placeholder="Ex. Tailles : S, M, L | Couleurs : Rouge, Noir"
          hint="Champ libre pour informer vos clients des tailles, couleurs ou formats."
          error={state.fieldErrors?.options_text}
        />
      </section>

      {/* Disponibilité & Stock */}
      <section className="rounded-3xl border border-line bg-white p-5 shadow-sm flex flex-col gap-4">
        <h2 className="text-base font-bold text-ink">Disponibilité & Stock</h2>

        <Toggle
          checked={isAvailable}
          onChange={setIsAvailable}
          name="is_available"
          label="Disponible à la vente"
          description="Si désactivé, le produit est affiché comme épuisé."
        />

        <div className="pt-2 border-t border-line">
          <Toggle
            checked={hasStock}
            onChange={setHasStock}
            name="has_stock"
            label="Gérer une quantité en stock"
            description="Activez pour limiter les ventes au stock disponible."
          />

          {hasStock && (
            <div className="pt-3">
              <Input
                label="Quantité en stock"
                name="stock"
                type="number"
                min={0}
                defaultValue={product?.stock ?? 1}
                required
                error={state.fieldErrors?.stock}
              />
            </div>
          )}
        </div>
      </section>

      <div className="sticky bottom-20 md:bottom-6 z-10 pt-2">
        <SubmitButton block pendingText="Enregistrement…">
          {product ? "Mettre à jour le produit" : "Ajouter le produit"}
        </SubmitButton>
      </div>
    </form>
  );
}
