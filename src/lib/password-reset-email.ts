import { getBrand } from "@/lib/brand";
import { resend, senderFrom } from "@/lib/resend";

export async function sendPasswordResetEmail({ email, resetUrl }: { email: string; resetUrl: string }) {
  if (!resend) {
    console.warn("RESEND_API_KEY não configurado. O e-mail de redefinição de senha não foi enviado.");
    return;
  }

  const brand = await getBrand();

  const { error } = await resend.emails.send({
    from: senderFrom(brand.name),
    to: email,
    replyTo: brand.supportEmail,
    subject: "Redefinição de senha - Área de Membros",
    html: `<h1>Redefinir sua senha</h1><p>Recebemos um pedido para criar uma nova senha para a sua conta na Área de Membros.</p><p><a href="${resetUrl}" style="display:inline-block;background:#17211f;color:#ffffff;text-decoration:none;padding:12px 24px;border-radius:4px;font-weight:bold;">Criar nova senha</a></p><p>Este link vale por 1 hora e só pode ser usado uma vez.</p><p>Se você não pediu a troca de senha, ignore este e-mail. Sua senha atual continua valendo.</p>`,
  });
  if (error) throw new Error(`Falha ao enviar o e-mail de redefinição para ${email}: ${error.message}`);
}
