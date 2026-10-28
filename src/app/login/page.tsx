"use client";

import { LoginBrand } from "@/components/BrandProvider";
import { FormEvent, useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { REMEMBER_COOKIE } from "@/lib/supabase/remember";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(true);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [accountBlocked, setAccountBlocked] = useState(false);

  useEffect(() => {
    setAccountBlocked(new URLSearchParams(window.location.search).get("message") === "account-blocked");
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");
    document.cookie = remember ? `${REMEMBER_COOKIE}=1; path=/; max-age=34560000; samesite=lax` : `${REMEMBER_COOKIE}=0; path=/; samesite=lax`;
    const supabase = createClient();
    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
    if (signInError) {
      setError("E-mail ou senha inválidos. Confira seus dados e tente novamente.");
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
            <h1>Acesse sua conta</h1>
            <p>Digite seu email e senha para entrar</p>
          </div>
          <form onSubmit={handleSubmit} className="admin-form">
            <label className="admin-field">Email<input required type="email" value={email} onChange={(event) => setEmail(event.target.value)} className="admin-input" placeholder="seu@email.com" autoComplete="email" /></label>
            <label className="admin-field">Senha<input required type="password" value={password} onChange={(event) => setPassword(event.target.value)} className="admin-input" autoComplete="current-password" /></label>
            <label className="admin-check"><input type="checkbox" checked={remember} onChange={(event) => setRemember(event.target.checked)} className="admin-checkbox" /> Manter conectado</label>
            {accountBlocked && <p className="login-error">Sua conta está bloqueada. Fale com a equipe de suporte.</p>}
            {error && <p className="login-error">{error}</p>}
            <button disabled={loading} className="btn login-submit">{loading ? <><Loader2 size={14} className="animate-spin" /> Entrando...</> : "Entrar"}</button>
          </form>
          <a href="/forgot-password" className="login-forgot">Esqueci minha senha</a>
        </section>
      </div>
    </main>
  );
}
