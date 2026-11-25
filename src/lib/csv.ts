/**
 * Utilitaire d'export de données (Excel Stylisé aux couleurs de la boutique et CSV Enrichi).
 * Compatible Microsoft Excel, Google Sheets, Apple Numbers et LibreOffice.
 */

export interface ShopExportMeta {
  shopName: string;
  shopSlug: string;
  primaryColor?: string | null;
  phone?: string | null;
  isCertified?: boolean;
  reportTitle: string; // Ex: "Rapport des Commandes", "Répertoire Clients"
  kpis?: Array<{ label: string; value: string | number }>;
  totalsRow?: Array<string | number | null | undefined>;
}

function escapeCsvCell(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return "";
  const str = String(value).replace(/\r?\n|\r/g, " ");
  if (/[";\t\n\r]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function escapeHtml(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return "";
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function isNumericHeader(header: string): boolean {
  const lower = header.toLowerCase();
  return (
    lower.includes("total") ||
    lower.includes("encaissé") ||
    lower.includes("reste") ||
    lower.includes("fcfa") ||
    lower.includes("montant") ||
    lower.includes("nombre") ||
    lower.includes("dépensé") ||
    lower.includes("prix")
  );
}

function getStatusBadgeStyle(val: string): { bg: string; text: string; border: string } | null {
  const lower = val.toLowerCase().trim();
  if (["livrée", "payé", "payee", "soldé", "active", "validé", "payée"].includes(lower)) {
    return { bg: "#DCFCE7", text: "#15803D", border: "#86EFAC" };
  }
  if (["confirmée", "en préparation", "prête", "en livraison", "livraison"].includes(lower)) {
    return { bg: "#DBEAFE", text: "#1E40AF", border: "#93C5FD" };
  }
  if (["en attente", "partiel", "retrait"].includes(lower)) {
    return { bg: "#FEF3C7", text: "#92400E", border: "#FDE68A" };
  }
  if (["annulée", "non payée", "rejeté", "refusé"].includes(lower)) {
    return { bg: "#FEE2E2", text: "#991B1B", border: "#FCA5A5" };
  }
  return null;
}

function triggerBrowserDownload(blob: Blob, filename: string) {
  if (typeof document === "undefined" || typeof window === "undefined") return;
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Construit la chaîne de contenu CSV structurée avec préambule boutique et BOM UTF-8.
 */
export function buildCsvContent(
  headers: string[],
  rows: Array<Array<string | number | null | undefined>>,
  meta?: ShopExportMeta
): string {
  const lines: string[] = [];

  if (meta) {
    const formattedDate = new Date().toLocaleString("fr-FR", {
      day: "2-digit",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
    const rawColor = meta.primaryColor?.trim();
  const primaryColor = rawColor ? (rawColor.startsWith("#") ? rawColor : `#${rawColor}`) : "#0F766E";
    const shopUrl = `https://bonwazadealer.vercel.app/${meta.shopSlug}`;

    lines.push(`"=== BON WAZ À DEALER — ${escapeCsvCell(meta.reportTitle || "RAPPORT OFFICIEL").toUpperCase()} ==="`);
    lines.push(
      `"Boutique :";${escapeCsvCell(meta.shopName)};"Thème & Couleur :";${escapeCsvCell(primaryColor)};"Certification :";${escapeCsvCell(meta.isCertified ? "Certifié Officiel" : "Standard")}`
    );
    lines.push(
      `"Vitrine :";${escapeCsvCell(shopUrl)};"WhatsApp :";${escapeCsvCell(meta.phone || "Non renseigné")};"Date d'export :";${escapeCsvCell(formattedDate)}`
    );

    if (meta.kpis && meta.kpis.length > 0) {
      const kpisStr = meta.kpis.map((k) => `${k.label}: ${k.value}`).join(" | ");
      lines.push(`"RÉCAPITULATIF :";${escapeCsvCell(kpisStr)}`);
    }

    lines.push(""); // Ligne vide de séparation avant les données
  }

  // En-têtes de colonnes
  lines.push(headers.map(escapeCsvCell).join(";"));

  // Lignes de données
  for (const row of rows) {
    lines.push(row.map(escapeCsvCell).join(";"));
  }

  // Ligne de totaux
  if (meta?.totalsRow) {
    lines.push(meta.totalsRow.map(escapeCsvCell).join(";"));
  }

  // BOM UTF-8 (\uFEFF)
  return "\uFEFF" + lines.join("\r\n");
}

/**
 * Génère un document Excel stylisé (.xls) intégrant :
 * - Le thème graphique de la boutique (couleur primaire)
 * - Le nom, l'URL vitrine, le contact WhatsApp et le badge certifié
 * - Des cartes de statistiques récapitulatives (KPIs)
 * - Les en-têtes stylisés, les rangées zébrées, les badges de statuts et la ligne de totaux
 */
export function buildExcelHtml(
  headers: string[],
  rows: Array<Array<string | number | null | undefined>>,
  meta: ShopExportMeta
): string {
  const rawColor = meta.primaryColor?.trim();
  const primaryColor = rawColor ? (rawColor.startsWith("#") ? rawColor : `#${rawColor}`) : "#0F766E";
  const shopName = meta.shopName || "Boutique";
  const reportTitle = meta.reportTitle || "Rapport de données";
  const publicUrl = `https://bonwazadealer.vercel.app/${meta.shopSlug}`;
  const phone = meta.phone || "Non renseigné";
  const isCertified = Boolean(meta.isCertified);
  const formattedDate = new Date().toLocaleString("fr-FR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  const kpisHtml =
    meta.kpis && meta.kpis.length > 0
      ? `
    <tr><td colspan="${headers.length}" style="height: 10px;"></td></tr>
    <tr>
      <td colspan="${headers.length}" style="padding: 0;">
        <table style="width: 100%; border-collapse: separate; border-spacing: 8px;">
          <tr>
            ${meta.kpis
              .map(
                (k) => `
              <td class="kpi-cell">
                <div class="kpi-title">${escapeHtml(k.label)}</div>
                <div class="kpi-num">${escapeHtml(k.value)}</div>
              </td>
            `
              )
              .join("")}
          </tr>
        </table>
      </td>
    </tr>
    <tr><td colspan="${headers.length}" style="height: 10px;"></td></tr>
  `
      : "";

  return `<html xmlns:o="urn:schemas-microsoft-com:office:office"
      xmlns:x="urn:schemas-microsoft-com:office:excel"
      xmlns="http://www.w3.org/TR/REC-html40">
<head>
  <meta http-equiv="Content-Type" content="text/html; charset=utf-8" />
  <!--[if gte mso 9]>
  <xml>
    <x:ExcelWorkbook>
      <x:ExcelWorksheets>
        <x:ExcelWorksheet>
          <x:Name>${escapeHtml(reportTitle.slice(0, 30))}</x:Name>
          <x:WorksheetOptions>
            <x:DisplayGridlines/>
          </x:WorksheetOptions>
        </x:ExcelWorksheet>
      </x:ExcelWorksheets>
    </x:ExcelWorkbook>
  </xml>
  <![endif]-->
  <style>
    body, table {
      font-family: 'Segoe UI', -apple-system, BlinkMacSystemFont, Roboto, Calibri, Arial, sans-serif;
      font-size: 11pt;
      color: #1E293B;
      border-collapse: collapse;
    }
    .banner {
      background-color: ${primaryColor};
      color: #FFFFFF;
      padding: 18px 24px;
    }
    .banner-title {
      font-size: 19pt;
      font-weight: 900;
      color: #FFFFFF;
      letter-spacing: -0.5px;
    }
    .banner-sub {
      font-size: 11pt;
      color: #F8FAFC;
      margin-top: 4px;
      font-weight: 500;
    }
    .meta-bar td {
      background-color: #F8FAFC;
      border-bottom: 3px solid ${primaryColor};
      padding: 10px 16px;
      font-size: 9.5pt;
      color: #475569;
    }
    .kpi-cell {
      background-color: #F8FAFC;
      border: 1px solid #CBD5E1;
      padding: 12px 18px;
      text-align: center;
      border-radius: 8px;
    }
    .kpi-title {
      font-size: 8.5pt;
      text-transform: uppercase;
      font-weight: 700;
      color: #64748B;
      letter-spacing: 0.5px;
    }
    .kpi-num {
      font-size: 15pt;
      font-weight: 900;
      color: ${primaryColor};
      margin-top: 4px;
    }
    th.col-header {
      background-color: ${primaryColor};
      color: #FFFFFF;
      font-weight: 800;
      font-size: 9.5pt;
      text-transform: uppercase;
      padding: 12px 14px;
      border: 1px solid rgba(0, 0, 0, 0.15);
      text-align: left;
      letter-spacing: 0.5px;
    }
    th.col-header-right {
      text-align: right;
    }
    td.cell {
      padding: 9px 14px;
      border: 1px solid #E2E8F0;
      font-size: 9.5pt;
      vertical-align: middle;
    }
    tr.odd td.cell {
      background-color: #F8FAFC;
    }
    tr.even td.cell {
      background-color: #FFFFFF;
    }
    .badge {
      font-weight: 800;
      padding: 3px 9px;
      border-radius: 6px;
      display: inline-block;
      font-size: 8.5pt;
      text-align: center;
    }
    .total-row td {
      background-color: #F1F5F9;
      font-weight: 900;
      font-size: 10pt;
      border-top: 2px solid ${primaryColor};
      border-bottom: 2px solid ${primaryColor};
      padding: 11px 14px;
    }
    .footer-note td {
      font-size: 8.5pt;
      color: #94A3B8;
      padding: 14px;
      font-style: italic;
    }
  </style>
</head>
<body>
  <table border="0" cellpadding="0" cellspacing="0">
    <!-- En-tête officiel de la boutique -->
    <tr>
      <td colspan="${headers.length}" class="banner">
        <div class="banner-title">${escapeHtml(shopName)}${isCertified ? " &nbsp;[★ CERTIFIÉ OFFICIEL]" : ""}</div>
        <div class="banner-sub">${escapeHtml(reportTitle)} &bull; Exporté le ${formattedDate}</div>
      </td>
    </tr>
    <!-- Barre de métadonnées -->
    <tr class="meta-bar">
      <td colspan="${headers.length}">
        <strong>Boutique :</strong> ${escapeHtml(shopName)} &nbsp;&bull;&nbsp;
        <strong>Vitrine :</strong> ${escapeHtml(publicUrl)} &nbsp;&bull;&nbsp;
        <strong>WhatsApp :</strong> ${escapeHtml(phone)} &nbsp;&bull;&nbsp;
        <strong>Thème / Couleur :</strong> ${primaryColor}
      </td>
    </tr>
    ${kpisHtml}
    <!-- En-têtes de colonnes -->
    <tr>
      ${headers
        .map((h) => {
          const isRight = isNumericHeader(h);
          return `<th class="col-header ${isRight ? "col-header-right" : ""}">${escapeHtml(h)}</th>`;
        })
        .join("")}
    </tr>
    <!-- Lignes de données -->
    ${rows
      .map((row, rIdx) => {
        const rowClass = rIdx % 2 === 0 ? "even" : "odd";
        return `
      <tr class="${rowClass}">
        ${row
          .map((cell, cIdx) => {
            const str = cell === null || cell === undefined ? "" : String(cell);
            const badgeStyle = getStatusBadgeStyle(str);
            const isRight = isNumericHeader(headers[cIdx]);
            if (badgeStyle) {
              return `<td class="cell" style="text-align: center;"><span class="badge" style="background-color: ${badgeStyle.bg}; color: ${badgeStyle.text}; border: 1px solid ${badgeStyle.border};">${escapeHtml(str)}</span></td>`;
            }
            const alignStyle = isRight ? "text-align: right;" : "";
            return `<td class="cell" style="${alignStyle}">${escapeHtml(str)}</td>`;
          })
          .join("")}
      </tr>`;
      })
      .join("")}
    <!-- Ligne de totaux optionnelle -->
    ${
      meta.totalsRow
        ? `
      <tr class="total-row">
        ${meta.totalsRow
          .map((cell, cIdx) => {
            const str = cell === null || cell === undefined ? "" : String(cell);
            const isRight = isNumericHeader(headers[cIdx]);
            return `<td style="${isRight ? "text-align: right;" : ""}">${escapeHtml(str)}</td>`;
          })
          .join("")}
      </tr>
    `
        : ""
    }
    <!-- Note de bas de page -->
    <tr><td colspan="${headers.length}" style="height: 12px;"></td></tr>
    <tr class="footer-note">
      <td colspan="${headers.length}">
        Rapport officiel confidentiel &bull; Généré automatiquement par Bon Waz à Dealer pour la boutique <strong>${escapeHtml(shopName)}</strong>.
      </td>
    </tr>
  </table>
</body>
</html>`;
}

/**
 * Exporte un fichier Excel stylisé (.xls) qui s'ouvre dans Microsoft Excel, Google Sheets,
 * LibreOffice ou Numbers avec les couleurs du thème, le logo/nom de la boutique, les KPIs et les badges.
 */
export function downloadStyledExcel(
  filename: string,
  headers: string[],
  rows: Array<Array<string | number | null | undefined>>,
  meta: ShopExportMeta
) {
  const html = buildExcelHtml(headers, rows, meta);
  const blob = new Blob([html], { type: "application/vnd.ms-excel;charset=utf-8;" });
  triggerBrowserDownload(blob, filename.endsWith(".xls") ? filename : `${filename}.xls`);
}

/**
 * Exporte un fichier CSV structuré (.csv) avec UTF-8 BOM, séparateur ';' standard pour Excel francophone,
 * et cartouche de métadonnées de la boutique en préambule.
 */
export function downloadCsv(
  filename: string,
  headers: string[],
  rows: Array<Array<string | number | null | undefined>>,
  meta?: ShopExportMeta
) {
  const csvContent = buildCsvContent(headers, rows, meta);
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  triggerBrowserDownload(blob, filename.endsWith(".csv") ? filename : `${filename}.csv`);
}
