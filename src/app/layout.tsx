import type { Metadata, Viewport } from "next";
import { APP_NAME, siteUrl } from "@/lib/constants";
import { InstallPwaBanner } from "@/components/ui/install-pwa-banner";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl()),
  title: {
    default: `${APP_NAME} — Créez votre boutique en ligne WhatsApp`,
    template: `%s · ${APP_NAME}`,
  },
  description:
    "Créez votre boutique en ligne en 2 minutes, présentez vos produits et recevez instantanément vos commandes sur WhatsApp.",
  applicationName: APP_NAME,
  keywords: [
    "Bon Waz à Dealer",
    "Bon Waz a Dealer",
    "boutique en ligne WhatsApp",
    "vendre sur WhatsApp",
    "catalogue WhatsApp",
    "créer boutique WhatsApp",
    "e-commerce Gabon",
    "boutique en ligne Gabon",
    "commerce WhatsApp",
  ],
  authors: [{ name: APP_NAME, url: siteUrl() }],
  creator: APP_NAME,
  publisher: APP_NAME,
  alternates: {
    canonical: "/",
  },
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/favicon-48x48.png", sizes: "48x48", type: "image/png" },
      { url: "/favicon.png", sizes: "96x96", type: "image/png" },
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    shortcut: "/favicon.ico",
    apple: [
      { url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
  },
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: APP_NAME,
  },
  openGraph: {
    type: "website",
    locale: "fr_FR",
    url: siteUrl(),
    siteName: APP_NAME,
    title: `${APP_NAME} — Créez votre boutique en ligne WhatsApp`,
    description:
      "Créez votre boutique en ligne en 2 minutes, présentez vos produits et recevez instantanément vos commandes sur WhatsApp.",
    images: [
      {
        url: "/icon-512.png",
        width: 512,
        height: 512,
        alt: `${APP_NAME} Logo`,
      },
    ],
  },
  twitter: {
    card: "summary",
    title: `${APP_NAME} — Créez votre boutique en ligne WhatsApp`,
    description:
      "Créez votre boutique en ligne en 2 minutes et recevez vos commandes sur WhatsApp.",
    images: ["/icon-512.png"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  verification: {
    google: "Aj_cO-kGLwgwfckLnIlYyYclZOrx-KdE_CX95YsUHwM",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#0f766e",
};

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": `${siteUrl()}/#organization`,
      name: APP_NAME,
      url: siteUrl(),
      logo: {
        "@type": "ImageObject",
        "@id": `${siteUrl()}/#logo`,
        url: `${siteUrl()}/icon-512.png`,
        contentUrl: `${siteUrl()}/icon-512.png`,
        caption: APP_NAME,
        inLanguage: "fr",
        width: "512",
        height: "512",
      },
      image: {
        "@id": `${siteUrl()}/#logo`,
      },
    },
    {
      "@type": "WebSite",
      "@id": `${siteUrl()}/#website`,
      url: siteUrl(),
      name: APP_NAME,
      description: "Créez votre boutique en ligne et recevez vos commandes sur WhatsApp.",
      publisher: {
        "@id": `${siteUrl()}/#organization`,
      },
      inLanguage: "fr",
    },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" suppressHydrationWarning>
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body className="min-h-dvh font-sans antialiased" suppressHydrationWarning>
        {children}
        <InstallPwaBanner />
      </body>
    </html>
  );
}
