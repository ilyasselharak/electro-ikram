import Resend from "@auth/core/providers/resend";

function randomDigits(length: number) {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => (b % 10).toString()).join("");
}

/**
 * Sends an 8-digit password-reset code through the Resend HTTP API.
 * Requires AUTH_RESEND_KEY (and optionally AUTH_EMAIL_FROM) on the Convex deployment.
 */
export const ResendOTPPasswordReset = Resend({
  id: "resend-otp",
  apiKey: process.env.AUTH_RESEND_KEY,
  maxAge: 60 * 15,
  async generateVerificationToken() {
    return randomDigits(8);
  },
  async sendVerificationRequest({ identifier: email, provider, token }) {
    if (!provider.apiKey) {
      throw new Error(
        "AUTH_RESEND_KEY n'est pas configurée sur le déploiement Convex : impossible d'envoyer le code.",
      );
    }
    const from = process.env.AUTH_EMAIL_FROM ?? "Electro-Ikram <onboarding@resend.dev>";
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${provider.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: [email],
        subject: "Electro-Ikram — Code de réinitialisation",
        text: `Votre code de réinitialisation du mot de passe est : ${token}\n\nIl expire dans 15 minutes. Si vous n'êtes pas à l'origine de cette demande, ignorez cet e-mail.`,
      }),
    });
    if (!res.ok) {
      throw new Error(`Resend error: ${res.status} ${await res.text()}`);
    }
  },
});
