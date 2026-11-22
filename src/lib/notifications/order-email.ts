import { createClient } from "@/lib/supabase/server";
import { getShopSubscription } from "@/lib/subscription";
import { formatFCFA } from "@/lib/format";
import { siteUrl } from "@/lib/constants";

export interface OrderEmailParams {
  shopSlug: string;
  publicCode: string;
  customerName: string;
  customerPhone: string;
  fulfillment: string;
  deliveryAddress?: string | null;
  items: Array<{
    name: string;
    quantity: number;
    price: number;
    options?: Record<string, string> | null;
  }>;
  total: number;
}

/**
 * Envoie un e-mail de notification au commerçant lors d'une nouvelle commande.
 * 
 * Règles strictes :
 * 1. Vérification du droit de forfait côté serveur (has_order_email_notifications).
 * 2. Vérification de la préférence commerçant (order_notifications_enabled).
 * 3. Résilience absolue : si l'envoi échoue, aucune exception n'est levée et la commande est validée.
 */
export async function sendOrderNotificationEmail(params: OrderEmailParams): Promise<void> {
  try {
    const supabase = await createClient();

    // 1. Récupération des informations de la boutique et de son propriétaire
    const { data: shop, error: shopErr } = await supabase
      .from("shops")
      .select("id, name, owner_id, order_notifications_enabled")
      .eq("slug", params.shopSlug)
      .maybeSingle();

    if (shopErr || !shop) return;

    // 2. Vérification de la préférence d'activation du commerçant
    if (!shop.order_notifications_enabled) {
      return;
    }

    // 3. Vérification du droit de forfait côté serveur
    const subscription = await getShopSubscription(shop.id);
    if (!subscription.effectivePlan.has_order_email_notifications) {
      return; // Fonctionnalité non incluse dans le forfait actuel
    }

    // 4. Récupération de l'e-mail du propriétaire commerçant
    // (Via requête Postgres sécurisée ou client Supabase)
    const { default: postgres } = await import("postgres");
    const dbUrl = process.env.DATABASE_URL || "postgresql://postgres.hzexwajoxzhistuqleek:EHZRvEmmt2aCxKZg@aws-1-eu-west-1.pooler.supabase.com:5432/postgres?sslmode=require";
    const sql = postgres(dbUrl);

    const userRows = await sql`
      SELECT email FROM auth.users WHERE id = ${shop.owner_id}
    `;
    await sql.end();

    const ownerEmail = userRows?.[0]?.email;
    if (!ownerEmail) return;

    // 5. Clé API Resend
    const resendApiKey = process.env.RESEND_API_KEY;
    if (!resendApiKey) {
      console.warn("⚠️ RESEND_API_KEY absente. E-mail de commande ignoré.");
      return;
    }

    const fromEmail = process.env.RESEND_FROM_EMAIL || "Bon Waz à Dealer <onboarding@resend.dev>";
    const dashboardOrderUrl = `${siteUrl()}/tableau-de-bord/commandes`;

    const itemsHtml = params.items
      .map((item) => {
        const optionsText = item.options ? ` (${Object.values(item.options).join(", ")})` : "";
        return `<tr>
          <td style="padding: 8px 0; border-bottom: 1px solid #F1F5F9; color: #0F172A; font-size: 13px;">
            <strong>${item.quantity}x</strong> ${item.name}${optionsText}
          </td>
          <td style="padding: 8px 0; border-bottom: 1px solid #F1F5F9; text-align: right; color: #0F172A; font-size: 13px; font-weight: 600;">
            ${formatFCFA(item.price * item.quantity)}
          </td>
        </tr>`;
      })
      .join("");

    const emailHtml = `
      <!DOCTYPE html>
      <html>
      <head><meta charset="utf-8"></head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #F8FAFC; padding: 24px 12px; margin: 0; color: #0F172A;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width: 540px; margin: 0 auto; background-color: #FFFFFF; border-radius: 20px; border: 1px solid #E2E8F0; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.03);">
          <tr>
            <td style="background-color: #0F766E; padding: 24px; text-align: center;">
              <span style="font-size: 18px; font-weight: 900; color: #FFFFFF; letter-spacing: -0.5px;">${shop.name}</span>
              <p style="margin: 4px 0 0 0; color: #CCFBF1; font-size: 12px;">Nouvelle commande reçue !</p>
            </td>
          </tr>
          <tr>
            <td style="padding: 28px 24px;">
              <h2 style="margin: 0 0 16px 0; font-size: 18px; font-weight: 800; color: #0F172A;">
                Commande #${params.publicCode}
              </h2>
              <div style="background-color: #F0FDFA; border-left: 4px solid #0D9488; padding: 12px 16px; border-radius: 8px; margin-bottom: 20px; font-size: 13px;">
                <p style="margin: 0 0 4px 0;"><strong>Client :</strong> ${params.customerName}</p>
                <p style="margin: 0 0 4px 0;"><strong>Téléphone :</strong> ${params.customerPhone}</p>
                <p style="margin: 0;"><strong>Mode :</strong> ${params.fulfillment === "delivery" ? `Livraison à ${params.deliveryAddress || "adresse renseignée"}` : "Retrait en boutique"}</p>
              </div>

              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 20px;">
                <thead>
                  <tr>
                    <th align="left" style="font-size: 11px; text-transform: uppercase; color: #64748B; padding-bottom: 8px; border-bottom: 2px solid #E2E8F0;">Article</th>
                    <th align="right" style="font-size: 11px; text-transform: uppercase; color: #64748B; padding-bottom: 8px; border-bottom: 2px solid #E2E8F0;">Total</th>
                  </tr>
                </thead>
                <tbody>
                  ${itemsHtml}
                </tbody>
                <tfoot>
                  <tr>
                    <td style="padding-top: 12px; font-size: 14px; font-weight: 800; color: #0F172A;">Total Commande</td>
                    <td align="right" style="padding-top: 12px; font-size: 16px; font-weight: 900; color: #0F766E;">${formatFCFA(params.total)}</td>
                  </tr>
                </tfoot>
              </table>

              <div style="text-align: center; margin-top: 24px;">
                <a href="${dashboardOrderUrl}" style="display: inline-block; background-color: #0F766E; color: #FFFFFF; font-size: 13px; font-weight: 700; text-decoration: none; padding: 12px 24px; border-radius: 12px;">
                  Gérer la commande dans mon tableau de bord →
                </a>
              </div>
            </td>
          </tr>
          <tr>
            <td style="background-color: #F8FAFC; border-top: 1px solid #E2E8F0; padding: 16px; text-align: center; font-size: 11px; color: #94A3B8;">
              Notification automatique de commande · Bon Waz à Dealer
            </td>
          </tr>
        </table>
      </body>
      </html>
    `;

    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: fromEmail,
        to: [ownerEmail],
        subject: `[${shop.name}] Nouvelle commande #${params.publicCode} (${formatFCFA(params.total)})`,
        html: emailHtml,
      }),
    });
  } catch (err) {
    // Règle 3.f : Échec silencieux non bloquant
    console.error("Échec de l'envoi de notification par e-mail:", err);
  }
}
