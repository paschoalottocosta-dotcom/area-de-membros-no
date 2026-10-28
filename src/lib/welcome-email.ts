import { getAppUrl } from "@/lib/app-url";
import { getBrand } from "@/lib/brand";
import { EMAIL_LOGO_BASE64 } from "@/lib/email-logo";
import { resend, senderFrom } from "@/lib/resend";

function escapeHtml(value: string) {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

function credentialBox(label: string, value: string) {
  return `<tr><td style="padding:0 0 10px;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f4f4f5;border:1px solid #e4e4e7;border-radius:6px;"><tr><td style="padding:14px 15px;"><div style="font-size:10px;letter-spacing:.04em;text-transform:uppercase;color:#71717a;margin:0 0 6px;">${label}</div><div style="font-size:14px;font-weight:700;color:#18181b;word-break:break-all;">${value}</div></td></tr></table></td></tr>`;
}

// O logo padrão vai anexado dentro do próprio e-mail (cid:), então aparece sem depender do endereço do site.
// Uma logo enviada em /admin/settings já tem endereço público (Supabase Storage) e é usada direto.
const LOGO_CONTENT_ID = "personal-organizado-logo";

export function buildWelcomeEmailHtml({ email, password, appUrl, brandName, logoUrl = `cid:${LOGO_CONTENT_ID}` }: { email: string; password: string; appUrl: string; brandName: string; logoUrl?: string }) {
  const BRAND = escapeHtml(brandName);
  const loginUrl = `${appUrl}/login`;
  const year = new Date().getFullYear();

  return `<!doctype html>
<html lang="pt-BR">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Seu acesso chegou!</title></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:Arial,Helvetica,sans-serif;color:#18181b;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f4f4f5;">
<tr><td align="center" style="padding:32px 16px;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:396px;">
    <tr><td align="center" style="padding:0 0 28px;font-size:14px;font-weight:700;color:#18181b;">${BRAND}</td></tr>
    <tr><td style="background:#ffffff;border:1px solid #e4e4e7;border-radius:10px;padding:26px 25px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
        <tr><td align="center" style="padding:0 0 14px;"><img src="${logoUrl}" width="44" height="44" alt="${BRAND}" style="display:block;width:44px;height:44px;border:0;border-radius:10px;"></td></tr>
        <tr><td align="center" style="font-size:18px;font-weight:700;color:#18181b;padding:0 0 12px;">Seu acesso chegou!</td></tr>
        <tr><td align="center" style="font-size:13px;line-height:20px;color:#52525b;padding:0 0 10px;">Sua compra foi confirmada. Use as credenciais abaixo para acessar a plataforma.</td></tr>
        <tr><td align="center" style="font-size:12px;font-weight:700;color:#18181b;padding:0 0 22px;">${BRAND}</td></tr>
        <tr><td style="border-top:1px solid #e4e4e7;font-size:0;line-height:0;">&nbsp;</td></tr>
        <tr><td style="padding:22px 0 12px;font-size:11px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#71717a;">Suas credenciais</td></tr>
        ${credentialBox("E-mail", escapeHtml(email))}
        ${credentialBox("Senha", escapeHtml(password))}
        <tr><td align="center" style="padding:12px 0 22px;"><a href="${loginUrl}" style="display:inline-block;background:#18181b;color:#ffffff;text-decoration:none;font-size:13px;font-weight:700;padding:13px 28px;border-radius:6px;">Acessar conteúdo</a></td></tr>
        <tr><td style="border-top:1px solid #e4e4e7;font-size:0;line-height:0;">&nbsp;</td></tr>
        <tr><td style="padding:18px 0 0;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border:1px solid #e4e4e7;border-radius:6px;"><tr><td style="padding:14px 15px;"><div style="font-size:12px;font-weight:700;color:#18181b;margin:0 0 6px;">Confira seu spam</div><div style="font-size:11px;line-height:17px;color:#52525b;">Se este e-mail caiu no <strong style="color:#18181b;">spam</strong> ou <strong style="color:#18181b;">lixo eletrônico</strong>, mova para a caixa de entrada para não perder atualizações.</div></td></tr></table></td></tr>
      </table>
    </td></tr>
    <tr><td align="center" style="padding:24px 0 14px;font-size:10px;color:#a1a1aa;border-bottom:1px solid #e4e4e7;">Enviado automaticamente · Não responda este e-mail</td></tr>
    <tr><td align="center" style="padding:16px 0 6px;font-size:12px;font-weight:700;color:#3f3f46;">${BRAND}</td></tr>
    <tr><td align="center" style="padding:0 0 6px;font-size:10px;color:#a1a1aa;">Todos os direitos reservados · ${year}</td></tr>
    <tr><td align="center" style="font-size:10px;color:#a1a1aa;">Você recebeu este e-mail porque realizou uma compra em nosso site.</td></tr>
  </table>
</td></tr>
</table>
</body>
</html>`;
}

export async function sendWelcomeEmail({ email, password }: { email: string; name: string; password: string }) {
  // Sem o e-mail o aluno não recebe a senha, então qualquer falha precisa aparecer (e não passar em silêncio).
  if (!resend) throw new Error("RESEND_API_KEY não configurado. O e-mail de boas-vindas não foi enviado.");

  const brand = await getBrand();

  const { error } = await resend.emails.send({
    from: senderFrom(brand.name),
    to: email,
    replyTo: brand.supportEmail,
    subject: "Seu acesso chegou!",
    html: buildWelcomeEmailHtml({ email, password, appUrl: getAppUrl(), brandName: brand.name, logoUrl: brand.hasCustomLogo ? brand.logoUrl : undefined }),
    attachments: brand.hasCustomLogo ? [] : [{ filename: "logo.png", content: EMAIL_LOGO_BASE64, contentType: "image/png", contentId: LOGO_CONTENT_ID }],
    text: `Seu acesso chegou!\n\nSua compra foi confirmada. Use as credenciais abaixo para acessar a plataforma.\n\nE-mail: ${email}\nSenha: ${password}\n\nAcessar conteúdo: ${getAppUrl()}/login\n\n${brand.name}`,
  });
  if (error) throw new Error(`Falha ao enviar o e-mail de boas-vindas para ${email}: ${error.message}`);
}
