import { describe, it, expect } from "vitest";
import { buildExcelHtml, buildCsvContent, type ShopExportMeta } from "@/lib/csv";

describe("Export de données (Excel stylisé et CSV)", () => {
  const meta: ShopExportMeta = {
    shopName: "Android/Appel",
    shopSlug: "android",
    primaryColor: "#E11D48",
    phone: "+241 07 77 45 59 7",
    isCertified: true,
    reportTitle: "Rapport des Commandes",
    kpis: [
      { label: "Total commandes", value: 12 },
      { label: "Chiffre d'Affaires", value: "250 000 FCFA" },
    ],
    totalsRow: ["TOTAL", "250 000 FCFA"],
  };

  const headers = ["Code commande", "Total (FCFA)"];
  const rows = [
    ["CMD-001", "150 000 FCFA"],
    ["CMD-002", "100 000 FCFA"],
  ];

  it("génère un document HTML Excel intégrant le thème, la couleur et le nom de la boutique", () => {
    const html = buildExcelHtml(headers, rows, meta);

    // Vérifier la présence du nom et de la couleur personnalisée
    expect(html).toContain("Android/Appel");
    expect(html).toContain("#E11D48");
    expect(html).toContain("CERTIFIÉ OFFICIEL");
    expect(html).toContain("Rapport des Commandes");

    // Vérifier les KPIs
    expect(html).toContain("Total commandes");
    expect(html).toContain("250 000 FCFA");

    // Vérifier les données et la ligne de totaux
    expect(html).toContain("CMD-001");
    expect(html).toContain("CMD-002");
    expect(html).toContain("TOTAL");
  });

  it("génère un CSV structuré avec BOM UTF-8 et métadonnées de la boutique", () => {
    const csv = buildCsvContent(headers, rows, meta);

    // BOM UTF-8
    expect(csv.startsWith("\uFEFF")).toBe(true);

    // Cartouche officiel
    expect(csv).toContain("=== BON WAZ À DEALER — RAPPORT DES COMMANDES ===");
    expect(csv).toContain("Android/Appel");
    expect(csv).toContain("#E11D48");
    expect(csv).toContain("+241 07 77 45 59 7");
    expect(csv).toContain("Total commandes: 12");

    // Séparateur ';' et données
    expect(csv).toContain("Code commande;Total (FCFA)");
    expect(csv).toContain("CMD-001;150 000 FCFA");
    expect(csv).toContain("TOTAL;250 000 FCFA");
  });
});
