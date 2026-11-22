"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import QRCode from "qrcode";
import { QrCode, X, Download, Copy, Check, Printer, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ShopQrCodeModalProps {
  url: string;
  shopName: string;
  shopSlug: string;
}

export function ShopQrCodeModal({ url, shopName, shopSlug }: ShopQrCodeModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState<string>("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (url) {
      QRCode.toDataURL(url, {
        width: 480,
        margin: 2,
        color: {
          dark: "#0F172A",
          light: "#FFFFFF",
        },
      })
        .then((dataUrl) => setQrDataUrl(dataUrl))
        .catch(console.error);
    }
  }, [url]);

  function handleDownload() {
    if (!qrDataUrl) return;
    const a = document.createElement("a");
    a.href = qrDataUrl;
    a.download = `qrcode-${shopSlug}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }

  function handlePrint() {
    if (!qrDataUrl) return;
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>QR Code - ${shopName}</title>
          <style>
            body {
              font-family: system-ui, -apple-system, sans-serif;
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              min-height: 100vh;
              margin: 0;
              text-align: center;
            }
            .card {
              border: 2px solid #E2E8F0;
              border-radius: 24px;
              padding: 40px;
              max-width: 380px;
              box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
            }
            h1 {
              font-size: 24px;
              font-weight: 800;
              margin: 0 0 8px 0;
              color: #0F172A;
            }
            p {
              font-size: 14px;
              color: #64748B;
              margin: 0 0 24px 0;
            }
            img {
              width: 280px;
              height: 280px;
              border-radius: 16px;
            }
            .url {
              margin-top: 20px;
              font-size: 13px;
              font-weight: 600;
              color: #0D9488;
              word-break: break-all;
            }
          </style>
        </head>
        <body>
          <div class="card">
            <h1>${shopName}</h1>
            <p>Scannez pour commander directement sur WhatsApp</p>
            <img src="${qrDataUrl}" alt="QR Code ${shopName}" />
            <div class="url">${url}</div>
          </div>
          <script>
            window.onload = function() {
              window.print();
              window.close();
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  }

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* ignore */
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        title="Afficher et télécharger le QR code de ma boutique"
        className="size-12 shrink-0 flex items-center justify-center rounded-2xl border border-line bg-white text-ink hover:bg-sand/70 hover:border-brand-500 shadow-xs transition-all active:scale-95"
      >
        <QrCode className="size-6 text-brand-700 stroke-[2.2]" />
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs overflow-y-auto">
          <div className="relative w-full max-w-sm rounded-3xl bg-white p-6 shadow-2xl my-8 text-center animate-in fade-in zoom-in-95 duration-150">
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="absolute top-4 right-4 grid size-8 place-items-center rounded-full text-muted hover:bg-sand hover:text-ink transition-colors"
            >
              <X className="size-4" />
            </button>

            <div className="flex flex-col items-center">
              <span className="grid size-11 place-items-center rounded-2xl bg-brand-50 text-brand-700 mb-3">
                <QrCode className="size-6" />
              </span>
              <h2 className="text-lg font-black text-ink">{shopName}</h2>
              <p className="text-xs text-muted mt-0.5">
                QR Code officiel de votre boutique en ligne
              </p>

              {/* Cadre du QR Code */}
              <div className="my-5 p-4 rounded-3xl border-2 border-line/80 bg-white shadow-xs">
                {qrDataUrl ? (
                  <Image
                    src={qrDataUrl}
                    alt={`QR Code ${shopName}`}
                    width={220}
                    height={220}
                    className="size-52 rounded-xl object-contain"
                    priority
                    unoptimized
                  />
                ) : (
                  <div className="size-52 flex items-center justify-center text-xs text-muted">
                    Génération du QR Code…
                  </div>
                )}
              </div>

              <p className="text-xs text-muted mb-4 max-w-xs leading-relaxed">
                Placez ce QR code sur vos comptoirs, emballages, flyers ou statuts WhatsApp pour que vos clients scannent et commandent en 1 seconde.
              </p>

              {/* Boutons d'action */}
              <div className="flex flex-col gap-2.5 w-full">
                <Button
                  type="button"
                  onClick={handleDownload}
                  disabled={!qrDataUrl}
                  className="w-full h-11 text-xs font-bold gap-2"
                >
                  <Download className="size-4" />
                  <span>Télécharger l&apos;image (PNG)</span>
                </Button>

                <div className="grid grid-cols-2 gap-2 w-full">
                  <button
                    type="button"
                    onClick={handlePrint}
                    disabled={!qrDataUrl}
                    className="flex items-center justify-center gap-1.5 h-10 rounded-2xl border border-line bg-white text-xs font-bold text-ink hover:bg-sand transition-colors"
                  >
                    <Printer className="size-3.5" />
                    <span>Imprimer</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleCopy}
                    className="flex items-center justify-center gap-1.5 h-10 rounded-2xl border border-line bg-white text-xs font-bold text-ink hover:bg-sand transition-colors"
                  >
                    {copied ? <Check className="size-3.5 text-success-600" /> : <Copy className="size-3.5" />}
                    <span>{copied ? "Lien copié" : "Copier lien"}</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
