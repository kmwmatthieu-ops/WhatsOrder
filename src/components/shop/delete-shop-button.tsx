"use client";

import { useState } from "react";
import { Trash2 } from "lucide-react";
import { DeleteShopModal } from "./delete-shop-modal";

type Props = {
  shopId: string;
  shopName: string;
};

export function DeleteShopButton({ shopId, shopName }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="mt-2.5 flex items-center justify-center gap-1.5 py-1 text-xs font-semibold text-danger-600 hover:text-danger-800 transition-colors"
        title="Supprimer cette boutique"
      >
        <Trash2 className="size-3.5" aria-hidden />
        <span>Supprimer cette boutique</span>
      </button>

      <DeleteShopModal
        isOpen={open}
        onClose={() => setOpen(false)}
        shopId={shopId}
        shopName={shopName}
      />
    </>
  );
}
