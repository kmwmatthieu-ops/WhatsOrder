/**
 * Envoi d'e-mail de réinitialisation de mot de passe via Resend.
 * Permet d'envoyer un lien direct avec token_hash et code OTP de secours,
 * évitant toute redirection tronquée vers localhost:3000.
 */

export interface PasswordResetEmailParams {
  email: string;
  resetUrl: string;
  otpCode?: string;
}

export async function sendPasswordResetEmail({
  email,
  resetUrl,
  otpCode,
}: PasswordResetEmailParams): Promise<{ ok: boolean; error?: string }> {
  try {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      console.warn("⚠️ RESEND_API_KEY absente. Impossible d'envoyer l'e-mail de réinitialisation.");
      return { ok: false, error: "Service d'e-mail non configuré." };
    }

    const fromEmail = process.env.RESEND_FROM_EMAIL || "Bon Waz à Dealer <onboarding@resend.dev>";

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Réinitialisation de votre mot de passe</title>
      </head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #F8FAFC; padding: 24px 12px; margin: 0; color: #0F172A;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width: 520px; margin: 0 auto; background-color: #FFFFFF; border-radius: 24px; border: 1px solid #E2E8F0; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.03);">
          <tr>
            <td style="background-color: #0F766E; padding: 28px 24px; text-align: center;">
              <span style="font-size: 20px; font-weight: 900; color: #FFFFFF; letter-spacing: -0.5px;">Bon Waz à Dealer</span>
              <p style="margin: 4px 0 0 0; color: #CCFBF1; font-size: 13px;">Sécurité de votre compte</p>
            </td>
          </tr>
          <tr>
            <td style="padding: 32px 24px;">
              <h1 style="margin: 0 0 12px 0; font-size: 18px; font-weight: 800; color: #0F172A;">
                Réinitialisation de votre mot de passe
              </h1>
              <p style="margin: 0 0 20px 0; font-size: 14px; line-height: 1.6; color: #475569;">
                Vous avez demandé la réinitialisation de votre mot de passe pour votre compte <strong>${email}</strong>. Cliquez sur le bouton ci-dessous pour choisir votre nouveau mot de passe :
              </p>

              <div style="text-align: center; margin: 28px 0;">
                <a href="${resetUrl}" style="display: inline-block; background-color: #0D9488; color: #FFFFFF; font-size: 14px; font-weight: 700; text-decoration: none; padding: 14px 28px; border-radius: 16px; box-shadow: 0 2px 6px rgba(13,148,136,0.3);">
                  Choisir mon nouveau mot de passe →
                </a>
              </div>

              ${
                otpCode
                  ? `
              <div style="background-color: #F1F5F9; border-radius: 16px; padding: 16px; text-align: center; margin-bottom: 24px;">
                <p style="margin: 0 0 6px 0; font-size: 12px; color: #64748B; font-weight: 600;">Code de sécurité à 8 chiffres :</p>
                <p style="margin: 0; font-family: monospace; font-size: 22px; font-weight: 900; letter-spacing: 4px; color: #0F172A;">
                  ${otpCode}
                </p>
              </div>
              `
                  : ""
              }

              <p style="margin: 0 0 12px 0; font-size: 12px; line-height: 1.5; color: #64748B;">
                Si le bouton ne fonctionne pas, copiez et collez ce lien direct dans votre navigateur :
              </p>
              <p style="margin: 0 0 24px 0; font-size: 11px; word-break: break-all; color: #0D9488;">
                <a href="${resetUrl}" style="color: #0D9488;">${resetUrl}</a>
              </p>

              <div style="border-top: 1px solid #E2E8F0; padding-top: 16px; font-size: 12px; color: #94A3B8; line-height: 1.5;">
                <p style="margin: 0;">Ce lien expire sous 1 heure. Si vous n'êtes pas à l'origine de cette demande, vous pouvez ignorer cet e-mail en toute sécurité. Votre mot de passe actuel ne sera pas modifié.</p>
              </div>
            </td>
          </tr>
          <tr>
            <td style="background-color: #F8FAFC; padding: 16px; text-align: center; font-size: 11px; color: #94A3B8; border-top: 1px solid #E2E8F0;">
              © ${new Date().getFullYear()} Bon Waz à Dealer · Plateforme e-commerce WhatsApp
            </td>
          </tr>
        </table>
      </body>
      </html>
    `;

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: fromEmail,
        to: [email],
        subject: "Réinitialisation de votre mot de passe — Bon Waz à Dealer",
        html: htmlContent,
      }),
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      console.error("Erreur Resend password reset:", errData);
      return { ok: false, error: "Échec de l'envoi de l'e-mail." };
    }

    return { ok: true };
  } catch (err: unknown) {
    console.error("Erreur sendPasswordResetEmail:", err);
    return { ok: false, error: err instanceof Error ? err.message : "Erreur inattendue." };
  }
}
