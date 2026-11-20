import type { Metadata, Viewport } from "next";
import { APP_NAME, siteUrl } from "@/lib/constants";
import { InstallPwaBanner } from "@/components/ui/install-pwa-banner";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl()),
  title: { default: APP_NAME, template: `%s · ${APP_NAME}` },
  description: "Créez votre boutique en ligne et recevez vos commandes sur WhatsApp.",
  icons: {
    icon: "/favicon.png",
    apple: "/apple-touch-icon.png",
  },
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: APP_NAME,
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#0f766e",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" suppressHydrationWarning>
      <body className="min-h-dvh font-sans antialiased" suppressHydrationWarning>
        {children}
        <InstallPwaBanner />
      </body>
    </html>
  );
}
