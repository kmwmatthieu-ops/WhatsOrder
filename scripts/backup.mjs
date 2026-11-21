import { createClient } from "@supabase/supabase-js";
import fs from "fs";
import path from "path";
import dotenv from "dotenv";

// Charger les variables d'environnement depuis .env.test ou .env.local
dotenv.config({ path: ".env.test" });
dotenv.config({ path: ".env.local" });

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error("❌ Erreur : Variables Supabase manquantes (SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY).");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const TABLES = [
  "admins",
  "subscription_plans",
  "shops",
  "shop_subscriptions",
  "subscription_requests",
  "saspay_payments",
  "categories",
  "delivery_zones",
  "products",
  "product_variants",
  "customers",
  "orders",
  "order_items",
  "order_payments",
  "order_status_history",
];

async function backup() {
  const now = new Date();
  const timestamp = now.toISOString().replace(/[:.]/g, "-").slice(0, 19);
  const backupDir = path.join(process.cwd(), "backups");

  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }

  console.log(`📦 Démarrage de la sauvegarde de Bon Waz à Dealer (${SUPABASE_URL})...\n`);

  const dumpData = {
    created_at: now.toISOString(),
    project_url: SUPABASE_URL,
    tables: {},
  };

  let sqlStatements = `-- Sauvegarde Bon Waz à Dealer - ${now.toISOString()}\n-- Projet: ${SUPABASE_URL}\n\n`;

  for (const table of TABLES) {
    const { data, error } = await supabase.from(table).select("*");
    if (error) {
      console.error(`⚠️ Erreur lors de la lecture de la table ${table}:`, error.message);
      continue;
    }

    dumpData.tables[table] = data || [];
    console.log(`  ✓ ${table.padEnd(22)} : ${data?.length ?? 0} enregistrements`);

    if (data && data.length > 0) {
      sqlStatements += `-- Table: ${table}\n`;
      for (const row of data) {
        const columns = Object.keys(row).join(", ");
        const values = Object.values(row)
          .map((v) => {
            if (v === null) return "NULL";
            if (typeof v === "number" || typeof v === "boolean") return v;
            if (Array.isArray(v) || typeof v === "object") return `'${JSON.stringify(v).replace(/'/g, "''")}'`;
            return `'${String(v).replace(/'/g, "''")}'`;
          })
          .join(", ");
        sqlStatements += `INSERT INTO public.${table} (${columns}) VALUES (${values}) ON CONFLICT DO NOTHING;\n`;
      }
      sqlStatements += "\n";
    }
  }

  // 1. Sauvegarde au format JSON
  const jsonPath = path.join(backupDir, `backup_${timestamp}.json`);
  fs.writeFileSync(jsonPath, JSON.stringify(dumpData, null, 2), "utf8");

  // 2. Sauvegarde au format SQL exécutable dans Supabase SQL Editor
  const sqlPath = path.join(backupDir, `backup_${timestamp}.sql`);
  fs.writeFileSync(sqlPath, sqlStatements, "utf8");

  console.log(`\n✅ Sauvegarde réussie avec succès !`);
  console.log(`📄 Fichier JSON : backups/backup_${timestamp}.json`);
  console.log(`📄 Fichier SQL  : backups/backup_${timestamp}.sql (prêt à être copié-collé dans Supabase SQL Editor en cas de besoin)`);
}

backup().catch((err) => {
  console.error("❌ Échec de la sauvegarde:", err);
  process.exit(1);
});
