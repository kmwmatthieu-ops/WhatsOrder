"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { Plus, Trash2, Star } from "lucide-react";
import { uploadImage } from "@/lib/images/resize-client";
import { MAX_PRODUCT_IMAGES } from "@/lib/constants";
import { Spinner } from "@/components/ui/spinner";

type Props = {
  images: string[];
  onChange: (images: string[]) => void;
  error?: string;
};

/** Sélecteur d'images de produit (jusqu'à 3 images, la première est la photo de couverture). */
export function ImagePicker({ images, onChange, error }: Props) {
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleFiles(fileList: FileList | null) {
    if (!fileList || fileList.length === 0) return;
    const remainingSlots = MAX_PRODUCT_IMAGES - images.length;
    if (remainingSlots <= 0) return;

    setUploading(true);
    setUploadError("");

    const filesToUpload = Array.from(fileList).slice(0, remainingSlots);
    const uploadedUrls: string[] = [];

    for (const file of filesToUpload) {
      try {
        const url = await uploadImage(file, "product");
        uploadedUrls.push(url);
      } catch (e) {
        setUploadError(e instanceof Error ? e.message : "Erreur lors de l'upload d'une photo.");
        break;
      }
    }

    if (uploadedUrls.length > 0) {
      onChange([...images, ...uploadedUrls]);
    }

    setUploading(false);
    if (inputRef.current) inputRef.current.value = "";
  }

  function removeImage(index: number) {
    onChange(images.filter((_, i) => i !== index));
  }

  function setAsCover(index: number) {
    if (index === 0) return;
    const target = images[index];
    const rest = images.filter((_, i) => i !== index);
    onChange([target, ...rest]);
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <label className="text-sm font-semibold">
          Photos du produit <span className="font-normal text-muted">({images.length}/{MAX_PRODUCT_IMAGES})</span>
        </label>
        <span className="text-xs text-muted">La 1ère est la couverture</span>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {images.map((url, idx) => (
          <div
            key={url}
            className="group relative aspect-square overflow-hidden rounded-2xl border border-line bg-sand"
          >
            <Image src={url} alt={`Photo ${idx + 1}`} fill sizes="120px" className="object-cover" />
            
            {idx === 0 && (
              <span className="absolute left-1.5 top-1.5 flex items-center gap-1 rounded-md bg-brand-600/90 px-1.5 py-0.5 text-[10px] font-bold text-white shadow-sm backdrop-blur-xs">
                <Star className="size-2.5 fill-current" /> Couverture
              </span>
            )}

            <div className="absolute inset-0 flex items-center justify-center gap-2 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity">
              {idx > 0 && (
                <button
                  type="button"
                  onClick={() => setAsCover(idx)}
                  className="grid size-8 place-items-center rounded-lg bg-white/90 text-ink hover:bg-white"
                  title="Définir comme photo principale"
                >
                  <Star className="size-4" />
                </button>
              )}
              <button
                type="button"
                onClick={() => removeImage(idx)}
                className="grid size-8 place-items-center rounded-lg bg-danger-600 text-white hover:bg-danger-700"
                title="Supprimer la photo"
              >
                <Trash2 className="size-4" />
              </button>
            </div>
          </div>
        ))}

        {images.length < MAX_PRODUCT_IMAGES && (
          <button
            type="button"
            disabled={uploading}
            onClick={() => inputRef.current?.click()}
            className="flex aspect-square flex-col items-center justify-center gap-1 rounded-2xl border-2 border-dashed border-line bg-white hover:border-brand-500 hover:bg-brand-50/30 transition-colors disabled:opacity-60"
          >
            {uploading ? (
              <Spinner className="size-6 text-brand-600" />
            ) : (
              <>
                <Plus className="size-6 text-muted" />
                <span className="text-xs font-semibold text-muted">Ajouter</span>
              </>
            )}
          </button>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
      />

      {(error || uploadError) && (
        <p role="alert" className="text-sm text-danger-600">
          {error || uploadError}
        </p>
      )}
    </div>
  );
}
