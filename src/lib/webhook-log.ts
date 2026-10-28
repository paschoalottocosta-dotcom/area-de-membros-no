import { createAdminClient } from "@/lib/supabase/admin";

export type WebhookLogStatus = "liberado" | "alerta" | "erro" | "ignorado" | "recusado";

// Registra o resultado de cada chamada do webhook para aparecer em /admin/settings.
// Nunca lança erro: o registro é um extra e não pode atrapalhar o processamento da compra.
export async function logWebhook(status: WebhookLogStatus, message: string, email?: string | null) {
  try {
    const { error } = await createAdminClient().from("webhook_logs").insert({ status, message, email: email ?? null });
    if (error) console.error("Não foi possível registrar o webhook:", error.message);
  } catch (error) {
    console.error("Não foi possível registrar o webhook:", error);
  }
}
