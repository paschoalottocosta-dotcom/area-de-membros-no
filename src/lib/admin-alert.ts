import { getBrand } from "@/lib/brand";
import { resend, senderFrom } from "@/lib/resend";

function escapeHtml(value: string) {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

// Avisa o dono por e-mail quando uma compra não pôde ser liberada direito.
// Nunca lança erro: o aviso é um extra e não pode atrapalhar o processamento da compra.
export async function sendAdminAlert(subject: string, details: string) {
  console.error(`[Alerta] ${subject}\n${details}`);
  if (!resend) return;
  try {
    const brand = await getBrand();
    const { error } = await resend.emails.send({
      from: senderFrom(brand.name),
      to: brand.alertEmail,
      subject: `[Área de Membros] ${subject}`,
      text: details,
      html: `<p><strong>${escapeHtml(subject)}</strong></p><pre style="white-space:pre-wrap;font-family:inherit;">${escapeHtml(details)}</pre>`,
    });
    if (error) console.error("Não foi possível enviar o alerta ao administrador:", error.message);
  } catch (error) {
    console.error("Não foi possível enviar o alerta ao administrador:", error);
  }
}
