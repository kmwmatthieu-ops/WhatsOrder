"use client";

import { useState, useTransition } from "react";
import { useRouter, usePathname } from "next/navigation";
import { Bell, BellOff, Check, Heart, Loader2, Plus, UserCheck, UserPlus } from "lucide-react";
import { toggleFollowShopAction } from "@/app/actions/follow";

interface FollowShopButtonProps {
  shopId: string;
  shopName?: string;
  initialFollowing?: boolean;
  initialFollowersCount?: number;
  variant?: "pill" | "button" | "compact" | "card";
  showCount?: boolean;
  onFollowChange?: (following: boolean, newCount: number) => void;
  className?: string;
}

export function FollowShopButton({
  shopId,
  shopName,
  initialFollowing = false,
  initialFollowersCount = 0,
  variant = "pill",
  showCount = false,
  onFollowChange,
  className = "",
}: FollowShopButtonProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [following, setFollowing] = useState(initialFollowing);
  const [followersCount, setFollowersCount] = useState(initialFollowersCount);
  const [isPending, startTransition] = useTransition();

  async function handleToggle(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();

    // Optimistic toggle
    const nextFollowing = !following;
    const nextCount = nextFollowing
      ? followersCount + 1
      : Math.max(0, followersCount - 1);

    setFollowing(nextFollowing);
    setFollowersCount(nextCount);
    onFollowChange?.(nextFollowing, nextCount);

    startTransition(async () => {
      const res = await toggleFollowShopAction(shopId);

      if (!res.success) {
        if (res.requiresAuth) {
          // Redirection vers la connexion avec retour sur la page actuelle
          const redirectUrl = `/compte/connexion?redirect=${encodeURIComponent(pathname || "/explorer")}`;
          router.push(redirectUrl);
          return;
        }

        // Revert en cas d'erreur
        setFollowing(!nextFollowing);
        setFollowersCount(followersCount);
        onFollowChange?.(!nextFollowing, followersCount);
        return;
      }

      if (typeof res.following === "boolean") {
        setFollowing(res.following);
      }
      if (typeof res.followersCount === "number") {
        setFollowersCount(res.followersCount);
      }
    });
  }

  if (variant === "compact") {
    return (
      <button
        type="button"
        onClick={handleToggle}
        disabled={isPending}
        className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-bold transition-all cursor-pointer ${
          following
            ? "bg-brand-50 border border-brand-200 text-brand-700 hover:bg-danger-50 hover:border-danger-200 hover:text-danger-600"
            : "bg-sand hover:bg-brand-50 text-ink hover:text-brand-700 border border-line"
        } ${className}`}
        title={following ? "Ne plus suivre cette boutique" : "Suivre cette boutique"}
      >
        {isPending ? (
          <Loader2 className="size-3 animate-spin" />
        ) : following ? (
          <Check className="size-3 text-brand-600" />
        ) : (
          <Plus className="size-3" />
        )}
        <span>{following ? "Suivi" : "Suivre"}</span>
      </button>
    );
  }

  if (variant === "card") {
    return (
      <button
        type="button"
        onClick={handleToggle}
        disabled={isPending}
        className={`inline-flex items-center gap-1.5 rounded-xl px-2.5 py-1 text-xs font-bold transition-all cursor-pointer ${
          following
            ? "bg-brand-50 border border-brand-200 text-brand-700 hover:bg-danger-50 hover:border-danger-200 hover:text-danger-600"
            : "bg-white hover:bg-brand-50 text-ink hover:text-brand-700 border border-line shadow-2xs"
        } ${className}`}
        title={following ? "Ne plus suivre cette boutique" : "Suivre cette boutique"}
      >
        {isPending ? (
          <Loader2 className="size-3.5 animate-spin" />
        ) : following ? (
          <UserCheck className="size-3.5 text-brand-600" />
        ) : (
          <UserPlus className="size-3.5 text-brand-600" />
        )}
        <span>{following ? "Abonné" : "Suivre"}</span>
      </button>
    );
  }

  // Variant "button" ou "pill" par défaut
  return (
    <button
      type="button"
      onClick={handleToggle}
      disabled={isPending}
      className={`inline-flex items-center justify-center gap-2 rounded-2xl px-4 py-2 text-xs sm:text-sm font-bold transition-all cursor-pointer shadow-xs active:scale-[0.98] ${
        following
          ? "bg-white border-2 border-brand-600 text-brand-700 hover:bg-danger-50 hover:border-danger-400 hover:text-danger-600"
          : "bg-brand-600 text-white hover:bg-brand-700 border-2 border-brand-600"
      } ${className}`}
      title={following ? "Ne plus suivre" : `Suivre ${shopName || "cette boutique"}`}
    >
      {isPending ? (
        <Loader2 className="size-4 animate-spin" />
      ) : following ? (
        <Check className="size-4" />
      ) : (
        <Plus className="size-4" />
      )}
      <span>{following ? "Abonné" : "Suivre la boutique"}</span>
      {showCount && (
        <span className={`text-xs px-2 py-0.5 rounded-full ${
          following ? "bg-brand-100 text-brand-800" : "bg-white/20 text-white"
        }`}>
          {followersCount}
        </span>
      )}
    </button>
  );
}
