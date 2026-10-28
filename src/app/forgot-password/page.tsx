"use client";

import { LoginBrand } from "@/components/BrandProvider";
import { FormEvent, useState } from "react";
import { Loader2 } from "lucide-react";

import { requestPasswordReset } from "@/app/forgot-password/actions";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    await requestPasswordReset(email);
    setLoading(false);
    setSent(true);
  }

  return (
    <main className="login-page">
      <div className="login-wrap">
        <LoginBrand />
        <section className="login-card">
          <div className="login-card__head">
            <h1>Esqueci minha senha</h1>
            <p>{sent ? "Confira sua caixa de entrada" : "Enviaremos um link para você criar uma nova senha"}</p>
          </div>
          {sent ? (
            <p className="field-hint" style={{ margin: 0, fontSize: 13, textAlign: "center", lineHeight: 1.6 }}>Se <strong>{email}</strong> estiver cadastrado, você receberá um e-mail em alguns minutos. Olhe também a caixa de spam.</p>
          ) : (
            <form onSubmit={handleSubmit} className="admin-form">
              <label className="admin-field">Email<input required type="email" value={email} onChange={(event) => setEmail(event.target.value)} className="admin-input" placeholder="seu@email.com" autoComplete="email" /></label>
              <button disabled={loading} className="btn login-submit">{loading ? <><Loader2 size={14} className="animate-spin" /> Enviando...</> : "Enviar link"}</button>
            </form>
          )}
          <a href="/login" className="login-forgot">Voltar para o login</a>
        </section>
      </div>
    </main>
  );
}
