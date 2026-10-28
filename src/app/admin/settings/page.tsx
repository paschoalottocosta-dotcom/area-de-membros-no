export const dynamic = "force-dynamic";

import { CircleCheck, CircleX } from "lucide-react";
import { headers } from "next/headers";

import { updateBrandSettings, updateTermsSettings } from "@/app/admin/actions";
import { CopyButton } from "@/components/CopyButton";
import { RichTextEditor } from "@/components/RichTextEditor";
import { getBrand } from "@/lib/brand";
import { senderAddress } from "@/lib/resend";
import { requireAdmin } from "@/lib/supabase/admin-auth";
import { getTermsHtml } from "@/lib/terms";
import type { WebhookLogStatus } from "@/lib/webhook-log";

interface WebhookLog { id: string; created_at: string; status: WebhookLogStatus; email: string | null; message: string; }

const statusLabels: Record<WebhookLogStatus, string> = { liberado: "Liberado", alerta: "Atenção", erro: "Erro", ignorado: "Ignorado", recusado: "Recusado" };

function formatDateTime(value: string) {
  return new Date(value).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo", day: "2-digit", month: "2-digit", year: "2-digit", hour: "2-digit", minute: "2-digit" });
}

function CheckItem({ ok, label, hint }: { ok: boolean; label: string; hint: string }) {
  return (
    <li className={`settings-check ${ok ? "" : "settings-check--missing"}`}>
      {ok ? <CircleCheck size={16} /> : <CircleX size={16} />}
      <span><strong>{label}</strong><small>{hint}</small></span>
    </li>
  );
}

export default async function AdminSettingsPage() {
  const { adminSupabase } = await requireAdmin();
  const [termsHtml, brand, logsResult] = await Promise.all([
    getTermsHtml(),
    getBrand(),
    adminSupabase.from("webhook_logs").select("id, created_at, status, email, message").order("created_at", { ascending: false }).limit(20),
  ]);
  const logs = (logsResult.data ?? []) as WebhookLog[];
  // Usa o endereço aberto no navegador (domínio próprio ou .vercel.app), que é o mesmo que a Yampi precisa chamar.
  const requestHeaders = await headers();
  const host = requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host") ?? "localhost:3000";
  const protocol = requestHeaders.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  const webhookUrl = `${protocol}://${host}/api/webhooks/yampi`;
  const hasWebhookSecret = !!process.env.YAMPI_WEBHOOK_SECRET;
  const hasResend = !!process.env.RESEND_API_KEY;

  return (
    <main className="admin-page">
      <div className="admin-wrap">
        <section className="page-section">
          <div className="section-head"><div><h1>Configurações</h1><p>Ajustes gerais da área de membros.</p></div></div>
        </section>

        <form action={updateBrandSettings} className="settings-section">
          <div className="settings-section__intro"><h2>Identidade</h2><p>Nome e logo aparecem no menu, no login, na aba do navegador e nos e-mails enviados aos alunos.</p></div>
          <div className="admin-form">
            <div className="panel settings-cover">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={brand.logoUrl} alt="Logo atual" className="settings-logo__preview" />
              <label className="admin-field">{brand.hasCustomLogo ? "Trocar logo" : "Enviar logo"}<input name="logo" type="file" accept="image/png,image/jpeg,image/webp" className="admin-input" /><span className="field-hint">Imagem quadrada (ex.: 512x512), PNG com fundo transparente, até 900 KB.</span></label>
            </div>
            <label className="admin-field">Nome da área de membros<input name="brand_name" required defaultValue={brand.name} className="admin-input" /><span className="field-hint">Também é o nome do remetente dos e-mails.</span></label>
            <label className="admin-field">E-mail de suporte<input name="support_email" type="email" required defaultValue={brand.supportEmail} className="admin-input" /><span className="field-hint">Aparece na página Suporte e recebe as respostas dos alunos aos e-mails.</span></label>
            <label className="admin-field">E-mail para avisos de compra<input name="alert_email" type="email" required defaultValue={brand.alertEmail} className="admin-input" /><span className="field-hint">Recebe um aviso quando uma compra não puder ser liberada automaticamente.</span></label>
            <div className="form-footer"><button className="btn">Salvar identidade</button></div>
          </div>
        </form>

        <section className="settings-section">
          <div className="settings-section__intro"><h2>Webhook da Yampi</h2><p>Cadastre este endereço na Yampi com o evento &quot;Pedido pago&quot;. As chaves secretas ficam nas variáveis de ambiente da Vercel, não aqui.</p></div>
          <div className="admin-form">
            <div className="admin-field">Endereço do webhook
              <div className="settings-copy-row"><input readOnly value={webhookUrl} className="admin-input" aria-label="Endereço do webhook" /><CopyButton text={webhookUrl} /></div>
            </div>
            <ul className="settings-checks">
              <CheckItem ok={hasWebhookSecret} label="Segredo do webhook" hint={hasWebhookSecret ? "YAMPI_WEBHOOK_SECRET configurado na Vercel." : "Falta YAMPI_WEBHOOK_SECRET na Vercel: nenhuma compra será aceita."} />
              <CheckItem ok={hasResend} label="Envio de e-mails" hint={hasResend ? `Resend configurado. Remetente: ${senderAddress}` : "Falta RESEND_API_KEY na Vercel: os alunos não recebem a senha."} />
            </ul>
          </div>
        </section>

        <section className="settings-section settings-section--full">
          <div className="settings-section__intro"><h2>Últimas compras recebidas</h2><p>As 20 chamadas mais recentes do webhook. Em &quot;Atenção&quot; ou &quot;Erro&quot;, confira o produto e libere o acesso pelo admin se precisar.</p></div>
          <div className="table-responsive">
            <table>
              <thead><tr><th>Data</th><th>Situação</th><th>E-mail</th><th>Detalhes</th></tr></thead>
              <tbody>
                {logsResult.error && <tr><td colSpan={4} className="muted">Não foi possível carregar o histórico. Confira se a migration do webhook foi aplicada no Supabase.</td></tr>}
                {!logsResult.error && logs.length === 0 && <tr><td colSpan={4} className="muted">Nenhuma compra recebida ainda.</td></tr>}
                {logs.map((log) => (
                  <tr key={log.id}>
                    <td className="muted" style={{ whiteSpace: "nowrap" }}>{formatDateTime(log.created_at)}</td>
                    <td><span className={`status-pill status-pill--${log.status}`}>{statusLabels[log.status]}</span></td>
                    <td className="muted">{log.email ?? "-"}</td>
                    <td>{log.message}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <form action={updateTermsSettings} className="settings-section settings-section--full">
          <div className="settings-section__intro"><h2>Termos e condições de Uso</h2><p>Texto do pop-up que o aluno precisa ler e aceitar no primeiro acesso. Também aparece em Meu Perfil.</p></div>
          <div className="admin-form">
            <RichTextEditor name="terms_html" defaultValue={termsHtml} minHeight={320} />
            <label className="admin-check"><input type="checkbox" name="require_reaccept" className="admin-checkbox" /> Pedir para todos aceitarem de novo (o pop-up volta a aparecer para todos os alunos)</label>
            <div className="form-footer"><button className="btn">Salvar termos</button></div>
          </div>
        </form>
      </div>
    </main>
  );
}
