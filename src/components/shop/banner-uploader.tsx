"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { Camera, Image as ImageIcon, Trash2 } from "lucide-react";
import { uploadImage } from "@/lib/images/resize-client";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";

type Props = {
  initialUrl: string | null;
  onChange?: (url: string | null) => void;
  onRemove?: () => Promise<{ error?: string }>;
};

/**
 * Upload de la bannière de boutique (recommandé 1200x400 WebP).
 */
export function BannerUploader({ initialUrl, onChange, onRemove }: Props) {
  const [url, setUrl] = useState(initialUrl);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleFile(file: File | undefined) {
    if (!file) return;
    setError("");
    setBusy(true);
    try {
      const newUrl = await uploadImage(file, "banner");
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
      <div className="relative w-full aspect-[3/1] max-h-48 overflow-hidden rounded-2xl border-2 border-dashed border-line bg-sand/60">
        {url ? (
          <Image
            src={url}
            alt="Bannière de la boutique"
            fill
            sizes="(max-width: 768px) 100vw, 800px"
            className="object-cover"
          />
        ) : (
          <div className="flex h-full w-full flex-col items-center justify-center gap-1.5 text-muted p-4 text-center">
            <ImageIcon className="size-8" aria-hidden />
            <p className="text-xs font-semibold">Ajouter une bannière d&apos;en-tête (format paysage 1200 × 400 recommandé)</p>
          </div>
        )}
        {busy && (
          <div className="absolute inset-0 grid place-items-center bg-white/70">
            <Spinner className="size-7 text-brand-600" />
          </div>
        )}
      </div>

      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={() => inputRef.current?.click()}
          disabled={busy}
        >
          <Camera className="size-4" aria-hidden />
          {url ? "Changer la bannière" : "Choisir une bannière"}
        </Button>
        {url && onRemove && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleRemove}
            disabled={busy}
          >
            <Trash2 className="size-4" aria-hidden />
            Retirer
          </Button>
        )}
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
