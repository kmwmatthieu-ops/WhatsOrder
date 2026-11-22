import { requireShop } from "@/lib/supabase/server";
import { getPlatformSetting } from "@/lib/subscription";
import { BottomNav } from "@/components/dashboard/bottom-nav";
import { Sidebar } from "@/components/dashboard/sidebar";
import { DashboardHeader } from "@/components/dashboard/header";
import { RealtimeOrderAlert } from "@/components/dashboard/realtime-order-alert";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [{ shop }, communityWhatsappUrl] = await Promise.all([
    requireShop(),
    getPlatformSetting("community_whatsapp_url"),
  ]);

  return (
    <div className="flex min-h-dvh flex-col md:flex-row bg-cream">
      <RealtimeOrderAlert shopId={shop.id} />
      <Sidebar shop={shop} communityWhatsappUrl={communityWhatsappUrl} />
      <div className="flex flex-1 flex-col pb-20 md:pb-8">
        <DashboardHeader shop={shop} communityWhatsappUrl={communityWhatsappUrl} />
        <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-6 md:px-8 md:py-8">
          {children}
        </main>
      </div>
      <BottomNav />
    </div>
  );
}
