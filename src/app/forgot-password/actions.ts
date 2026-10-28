"use server";

import { headers } from "next/headers";

import { sendPasswordResetEmail } from "@/lib/password-reset-email";
import { createAdminClient } from "@/lib/supabase/admin";

export async function requestPasswordReset(email: string) {
  const normalizedEmail = email.trim().toLowerCase();
  if (!normalizedEmail) return;

  const requestHeaders = await headers();
  const host = requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host") ?? "localhost:3000";
  const protocol = requestHeaders.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");

  // Gera o link de recuperação sem enviar o e-mail padrão do Supabase; o envio é feito pelo Resend.
  const { data, error } = await createAdminClient().auth.admin.generateLink({ type: "recovery", email: normalizedEmail });
  // Se o e-mail não existir, não avisamos: a resposta é sempre a mesma para não revelar quem é aluno.
  if (error || !data.properties?.hashed_token) return;

  const resetUrl = new URL("/reset-password", `${protocol}://${host}`);
  resetUrl.searchParams.set("token_hash", data.properties.hashed_token);

  try {
    await sendPasswordResetEmail({ email: normalizedEmail, resetUrl: resetUrl.toString() });
  } catch (sendError) {
    console.error("Falha ao enviar e-mail de redefinição de senha", sendError);
  }
}
