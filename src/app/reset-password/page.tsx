"use client";

import { LoginBrand } from "@/components/BrandProvider";
import { FormEvent, useEffect, useState } from "react";
import { Loader2 } from "lucide-react";

import { createClient } from "@/lib/supabase/client";

export default function ResetPasswordPage() {
  const [tokenHash, setTokenHash] = useState<string | null>(null);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [verified, setVerified] = useState(false);

  useEffect(() => {
    setTokenHash(new URLSearchParams(window.location.search).get("token_hash") ?? "");
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    if (password.length < 6) return setError("A nova senha deve ter no mínimo 6 caracteres.");
    if (password !== confirmPassword) return setError("As senhas não coincidem.");
    if (!tokenHash) return setError("Link inválido. Peça um novo link de redefinição.");

    setLoading(true);
    const supabase = createClient();
    // O link só é validado ao enviar o formulário, para que leitores automáticos de e-mail não o "gastem".
    // Ele só pode ser validado uma vez: se a troca da senha falhar, a nova tentativa usa a sessão já aberta.
    if (!verified) {
      const { error: verifyError } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type: "recovery" });
      if (verifyError) {
        setError("Este link expirou ou já foi usado. Peça um novo link de redefinição.");
        setLoading(false);
        return;
      }
      setVerified(true);
    }
    const { error: updateError } = await supabase.auth.updateUser({ password });
    if (updateError) {
      setError(updateError.code === "same_password" ? "A nova senha precisa ser diferente da senha atual."
        : updateError.code === "weak_password" ? "Essa senha é muito fraca. Use uma senha mais longa, misturando letras e números."
        : `Não foi possível alterar a senha (${updateError.message}). Tente novamente.`);
      setLoading(false);
      return;
    }
    window.location.assign("/dashboard");
  }

  return (
    <main className="login-page">
      <div className="login-wrap">
        <LoginBrand />
        <section className="login-card">
          <div className="login-card__head">
            <h1>Criar nova senha</h1>
            <p>Escolha uma senha nova para sua conta</p>
          </div>
          {tokenHash === "" ? (
            <p className="login-error" style={{ textAlign: "center" }}>Link inválido. Peça um novo link de redefinição.</p>
          ) : (
            <form onSubmit={handleSubmit} className="admin-form">
              <label className="admin-field">Nova senha<input required type="password" value={password} onChange={(event) => setPassword(event.target.value)} minLength={6} placeholder="Mínimo 6 caracteres" className="admin-input" autoComplete="new-password" /></label>
              <label className="admin-field">Confirmar nova senha<input required type="password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} minLength={6} placeholder="Repita a nova senha" className="admin-input" autoComplete="new-password" /></label>
              {error && <p className="login-error">{error}</p>}
              <button disabled={loading || tokenHash === null} className="btn login-submit">{loading ? <><Loader2 size={14} className="animate-spin" /> Salvando...</> : "Salvar nova senha"}</button>
            </form>
          )}
          <a href="/forgot-password" className="login-forgot">Pedir um novo link</a>
        </section>
      </div>
    </main>
  );
}
