import type { Metadata } from "next";
import Link from "next/link";
import { CreditCard, ArrowRight, QrCode, LogOut } from "lucide-react";
import { requireShop, getUser } from "@/lib/supabase/server";
import { getShopSubscription, getPlatformSetting } from "@/lib/subscription";
import { shopUrl } from "@/lib/constants";
import { signOut } from "@/app/(auth)/actions";
import { WhatsAppIcon } from "@/components/ui/whatsapp-icon";
import { SettingsForm } from "./settings-form";
import { AccountSettingsCard } from "./account-settings-card";
import { OrderNotificationsCard } from "./order-notifications-card";
import { ShopQrCodeModal } from "@/components/shop/shop-qr-code-modal";
import type { DeliveryZone } from "@/types/database";

export const metadata: Metadata = { title: "Paramètres de la boutique" };

export default async function SettingsPage() {
  const [{ shop, supabase }, user, communityWhatsappUrl] = await Promise.all([
    requireShop(),
    getUser(),
    getPlatformSetting("community_whatsapp_url"),
  ]);
  const subscription = await getShopSubscription(shop.id);

  const { data: zones } = await supabase
    .from("delivery_zones")
    .select("*")
    .eq("shop_id", shop.id)
    .order("name");

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-extrabold text-ink">Paramètres</h1>
        <p className="text-muted text-sm">Gérez les coordonnées, options de livraison, horaires, sécurité et notifications de votre boutique.</p>
      </div>

      <Link
        href="/tableau-de-bord/abonnement"
        className="flex items-center justify-between rounded-3xl border border-line bg-white p-5 shadow-xs hover:border-brand-600 hover:shadow-md transition-all group"
      >
        <div className="flex items-center gap-3.5">
          <span className="grid size-11 place-items-center rounded-2xl bg-brand-50 text-brand-600 group-hover:scale-105 transition-transform">
            <CreditCard className="size-6" />
          </span>
          <div>
            <h2 className="text-sm font-bold text-ink">Mon Abonnement & Limites</h2>
            <p className="text-xs text-muted">Consultez votre formule, vos quotas de produits et vos commandes mensuelles.</p>
          </div>
        </div>
        <ArrowRight className="size-5 text-muted group-hover:text-brand-600 group-hover:translate-x-1 transition-all" />
      </Link>

      {/* QR Code officiel de la boutique */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-3xl border border-line bg-white p-5 shadow-xs">
        <div className="flex items-center gap-3.5">
          <span className="grid size-11 place-items-center rounded-2xl bg-brand-50 text-brand-600">
            <QrCode className="size-6" />
          </span>
          <div>
            <h2 className="text-sm font-bold text-ink">QR Code de votre boutique</h2>
            <p className="text-xs text-muted">Affichez, imprimez ou téléchargez le QR code pour vos emballages et comptoirs.</p>
          </div>
        </div>
        <div className="shrink-0 flex items-center gap-2">
          <ShopQrCodeModal url={shopUrl(shop.slug)} shopName={shop.name} shopSlug={shop.slug} />
          <span className="text-xs font-semibold text-muted">Voir mon QR code</span>
        </div>
      </div>

      {/* 1. Informations et style de la boutique */}
      <SettingsForm shop={shop} initialZones={(zones as DeliveryZone[]) ?? []} />

      {/* 2. Notifications de commande par e-mail (Point 3) */}
      <OrderNotificationsCard
        initialEnabled={shop.order_notifications_enabled ?? true}
        hasOrderEmailNotifications={subscription.effectivePlan.has_order_email_notifications}
        currentPlanName={subscription.effectivePlan.name}
      />

      {/* 3. Communauté WhatsApp Commerçants */}
      <section className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-3xl border border-emerald-200 bg-emerald-50/70 p-5 shadow-xs">
        <div className="flex items-center gap-3.5">
          <span className="grid size-11 place-items-center rounded-2xl bg-emerald-600 text-white shrink-0">
            <WhatsAppIcon className="size-6 fill-white text-white" />
          </span>
          <div>
            <h2 className="text-sm font-bold text-emerald-950">Communauté WhatsApp Officielle</h2>
            <p className="text-xs text-emerald-800 mt-0.5">Échangez avec les autres commerçants, découvrez les astuces et recevez les mises à jour.</p>
          </div>
        </div>
        <a
          href={communityWhatsappUrl?.trim() || "https://chat.whatsapp.com/InviteBonWazPlatform"}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-4 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-emerald-700 transition-colors shrink-0"
        >
          <WhatsAppIcon className="size-4 fill-white text-white" />
          <span>Rejoindre la communauté</span>
        </a>
      </section>

      {/* 4. Compte Commerçant & Sécurité (Point 2) */}
      <AccountSettingsCard currentEmail={user?.email || ""} />

      {/* 5. Déconnexion (accessible sur mobile sous les paramètres) */}
      <div className="pt-2 md:hidden">
        <form action={signOut}>
          <button
            type="submit"
            className="flex w-full items-center justify-center gap-2 rounded-2xl border border-danger-200 bg-danger-50/60 py-3 text-sm font-bold text-danger-700 hover:bg-danger-100 transition-colors"
          >
            <LogOut className="size-4" />
            <span>Se déconnecter</span>
          </button>
        </form>
      </div>
    </div>
  );
}
