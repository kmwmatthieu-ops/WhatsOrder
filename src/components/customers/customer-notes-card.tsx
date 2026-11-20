"use client";

import { useState, useTransition } from "react";
import { StickyNote, Check, Lock } from "lucide-react";
import { updateCustomerNotes } from "@/app/tableau-de-bord/clients/actions";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";

type Props = {
  customerId: string;
  initialNotes: string | null;
};

export function CustomerNotesCard({ customerId, initialNotes }: Props) {
  const [notes, setNotes] = useState(initialNotes ?? "");
  const [isPending, startTransition] = useTransition();
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  const hasChanged = notes !== (initialNotes ?? "");

  function handleSave() {
    setError("");
    setSuccess(false);

    startTransition(async () => {
      const res = await updateCustomerNotes(customerId, notes);
      if (res.error) {
        setError(res.error);
      } else {
        setSuccess(true);
        setTimeout(() => setSuccess(false), 2500);
      }
    });
  }

  return (
    <section className="rounded-3xl border border-line bg-white p-5 shadow-xs flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <StickyNote className="size-4 text-brand-600" />
          <h2 className="text-xs font-bold uppercase tracking-wider text-muted">Notes internes sur le client</h2>
        </div>
        <div className="flex items-center gap-1 text-[11px] text-muted">
          <Lock className="size-3 text-muted/80" />
          <span>Privé (visible uniquement par vous)</span>
        </div>
      </div>

      <div className="relative">
        <textarea
          value={notes}
          onChange={(e) => {
            setNotes(e.target.value);
            setSuccess(false);
          }}
          maxLength={2000}
          rows={3}
          placeholder="Ex. Client fidèle, préfère la livraison avant midi, rappel pour paiement Wave, etc."
          className="w-full rounded-2xl border border-line bg-sand/30 p-3.5 text-xs text-ink outline-none transition-colors placeholder:text-muted/70 focus:border-brand-600 focus:bg-white focus:ring-4 focus:ring-brand-100 resize-y"
        />
        <div className="flex items-center justify-between mt-1 text-[11px] text-muted">
          <span>{notes.length} / 2000 caractères</span>
          {success && (
            <span className="flex items-center gap-1 text-success-600 font-bold">
              <Check className="size-3.5" />
              Notes enregistrées
            </span>
          )}
        </div>
      </div>

      {error && <p className="text-xs text-danger-600 font-semibold">{error}</p>}

      <div className="flex justify-end">
        <Button
          type="button"
          size="sm"
          onClick={handleSave}
          disabled={isPending || !hasChanged}
          className="self-end"
        >
          {isPending ? <Spinner className="size-4" /> : null}
          <span>Enregistrer les notes</span>
        </Button>
      </div>
    </section>
  );
}
