"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { Camera, Store, Trash2 } from "lucide-react";
import { uploadImage } from "@/lib/images/resize-client";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";

type Props = {
  initialUrl: string | null;
  /** Appelé après upload (url) ou suppression (null). */
  onChange?: (url: string | null) => void;
  onRemove?: () => Promise<{ error?: string }>;
};

/**
 * Upload du logo : redimensionné sur le téléphone, converti en WebP par le
 * serveur qui met aussi à jour shops.logo_url (et supprime l'ancien logo).
 */
export function LogoUploader({ initialUrl, onChange, onRemove }: Props) {
  const [url, setUrl] = useState(initialUrl);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleFile(file: File | undefined) {
    if (!file) return;
    setError("");
    setBusy(true);
    try {
      const newUrl = await uploadImage(file, "logo");
      setUrl(newUrl);
      onChange?.(newUrl);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Envoi impossible.");
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  async function handleRemove() {
    if (!onRemove) return;
    setBusy(true);
    setError("");
    const res = await onRemove();
    setBusy(false);
    if (res.error) return setError(res.error);
    setUrl(null);
    onChange?.(null);
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-4">
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={busy}
          className="relative grid size-24 shrink-0 place-items-center overflow-hidden rounded-3xl border-2 border-dashed border-line bg-white text-muted"
          aria-label={url ? "Changer le logo" : "Ajouter un logo"}
        >
          {url ? (
            <Image src={url} alt="Logo de la boutique" fill sizes="96px" className="object-cover" />
          ) : (
            <Store className="size-9" aria-hidden />
          )}
          {busy && (
            <span className="absolute inset-0 grid place-items-center bg-white/70">
              <Spinner className="size-6 text-brand-600" />
            </span>
          )}
        </button>
        <div className="flex flex-col gap-2">
          <Button type="button" variant="secondary" size="sm" onClick={() => inputRef.current?.click()} disabled={busy}>
            <Camera className="size-4" aria-hidden />
            {url ? "Changer" : "Choisir une image"}
          </Button>
          {url && onRemove && (
            <Button type="button" variant="ghost" size="sm" onClick={handleRemove} disabled={busy}>
              <Trash2 className="size-4" aria-hidden />
              Retirer
            </Button>
          )}
        </div>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => handleFile(e.target.files?.[0])}
      />
      {error && (
        <p role="alert" className="text-sm text-danger-600">
          {error}
        </p>
      )}
    </div>
  );
}
