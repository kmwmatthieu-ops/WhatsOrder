"use client";

import { useEffect, useState, type SyntheticEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Trash2 } from "lucide-react";
import { Input, Textarea, Select } from "@/components/ui/field";
import { Toggle } from "@/components/ui/toggle";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { ImagePicker } from "./image-picker";
import { VariantsEditor } from "./variants-editor";
import { initialActionState, type ActionState } from "@/lib/action-state";
import type { Category, ProductWithVariants } from "@/types/database";
import type { ProductVariantInput } from "@/lib/validation/product";

type Props = {
  product?: ProductWithVariants;
  categories: Category[];
  action: (_prev: ActionState, formData: FormData) => Promise<ActionState>;
  onDelete?: () => Promise<{ error?: string }>;
};

export function ProductForm({ product, categories, action, onDelete }: Props) {
  const router = useRouter();
  const [state, setState] = useState<ActionState>(initialActionState);
  const [pending, setPending] = useState(false);

  const initialVariants = product?.product_variants ?? [];
  const [images, setImages] = useState<string[]>(product?.images ?? []);
  const [basePrice, setBasePrice] = useState<number>(product?.price ?? 0);
  const [variantsEnabled, setVariantsEnabled] = useState<boolean>(initialVariants.length > 0);
  const [variants, setVariants] = useState<ProductVariantInput[]>(() =>
    initialVariants.map((v) => ({
      id: v.id,
      label: v.label,
      attributes: (v.attributes as ProductVariantInput["attributes"]) || {},
      price_override: v.price_override,
      stock: v.stock,
      is_available: v.is_available,
    }))
  );
  const [hasStock, setHasStock] = useState(product ? product.stock !== null : false);
  const [isAvailable, setIsAvailable] = useState(product ? product.is_available : true);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  useEffect(() => {
    if (state.ok) {
      router.replace("/tableau-de-bord/produits");
      router.refresh();
    }
  }, [state.ok, router]);

  async function handleSubmit(e: SyntheticEvent<HTMLFormElement>) {
    e.preventDefault();
    if (pending || deleting) return;

    setPending(true);
    setState(initialActionState);
    const formData = new FormData(e.currentTarget);
    try {
      const res = await action(initialActionState, formData);
      setState(res);
      if (!res.ok) setPending(false);
    } catch {
      setState({ error: "Connexion impossible. Vérifiez votre réseau puis réessayez." });
      setPending(false);
    }
  }

  async function handleDelete() {
    if (!onDelete || !confirm("Voulez-vous vraiment supprimer définitivement ce produit ?")) return;
    setDeleting(true);
    setDeleteError("");
    try {
      const res = await onDelete();
      if (res.error) {
        setDeleteError(res.error);
        setDeleting(false);
      } else {
        router.replace("/tableau-de-bord/produits");
        router.refresh();
      }
    } catch {
      setDeleteError("Suppression impossible. Vérifiez votre réseau puis réessayez.");
      setDeleting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6" noValidate>
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
            label="Prix de base (FCFA)"
            name="price"
            type="number"
            min={1}
            step={50}
            defaultValue={product?.price ?? ""}
            onChange={(e) => setBasePrice(Number(e.target.value) || 0)}
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
      </section>

      {/* Variantes structurées (V2-C : remplace options_text) */}
      <VariantsEditor
        initialVariants={initialVariants}
        basePrice={basePrice}
        onChange={(nextVariants, isEnabled) => {
          setVariants(nextVariants);
          setVariantsEnabled(isEnabled && nextVariants.length > 0);
        }}
      />
      <input
        type="hidden"
        name="variants_json"
        value={JSON.stringify(variantsEnabled ? variants : [])}
      />
      {state.fieldErrors?.variants && (
        <Alert tone="error">{state.fieldErrors.variants}</Alert>
      )}

      {/* Disponibilité & Stock */}
      <section className="rounded-3xl border border-line bg-white p-5 shadow-sm flex flex-col gap-4">
        <h2 className="text-base font-bold text-ink">Disponibilité & Stock</h2>

        <Toggle
          checked={isAvailable}
          onChange={setIsAvailable}
          name="is_available"
          label="Disponible à la vente"
          description="Si désactivé, le produit entier est affiché comme épuisé."
        />

        {variantsEnabled && variants.length > 0 ? (
          <p className="text-xs text-muted border-t border-line pt-3">
            Le stock est géré individuellement sur chacune de vos <strong>{variants.length} variantes</strong> ci-dessus.
          </p>
        ) : (
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
        )}
      </section>

      <div className="sticky bottom-20 md:bottom-6 z-10 pt-2">
        <Button type="submit" block loading={pending}>
          {pending
            ? "Enregistrement…"
            : product
              ? "Mettre à jour le produit"
              : "Ajouter le produit"}
        </Button>
      </div>
    </form>
  );
}
