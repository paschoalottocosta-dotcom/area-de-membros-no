import { Resend } from "resend";

export const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

// O endereço precisa ser de um domínio verificado no Resend (fica na Vercel); o nome exibido é o da área de membros.
export const senderAddress = (() => {
  const configured = process.env.RESEND_FROM_EMAIL ?? "acesso@personalorganizado.com.br";
  return configured.match(/<([^>]+)>/)?.[1]?.trim() ?? configured.trim();
})();

export function senderFrom(name: string) {
  return `${name.replace(/[<>"]/g, "")} <${senderAddress}>`;
}
