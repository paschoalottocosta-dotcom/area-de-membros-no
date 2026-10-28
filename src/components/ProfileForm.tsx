"use client";

import { FormEvent, useState } from "react";
import { Loader2 } from "lucide-react";

import { updateOwnBio } from "@/app/admin/actions";
import { createClient } from "@/lib/supabase/client";

interface ProfileFormProps {
  profileId: string;
  initialName: string;
  email: string;
  initialBio: string;
}

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

export default function ProfileForm({ profileId, initialName, email, initialBio }: ProfileFormProps) {
  const [name, setName] = useState(initialName);
  const [bio, setBio] = useState(initialBio);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [status, setStatus] = useState("");
  const [passwordStatus, setPasswordStatus] = useState("");
  const [saving, setSaving] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);

  async function handleProfileSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setStatus("");
    const supabase = createClient();
    const { error: nameError } = await supabase.auth.updateUser({ data: { name: name.trim() } });
    if (nameError) {
      setStatus(nameError.message);
      setSaving(false);
      return;
    }

    const formData = new FormData();
    formData.set("profile_id", profileId);
    formData.set("bio", bio);
    try {
      await updateOwnBio(formData);
      setStatus("Alterações salvas.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Não foi possível salvar as alterações.");
    } finally {
      setSaving(false);
    }
  }

  async function handlePasswordSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPasswordStatus("");
    if (newPassword.length < 6) {
      setPasswordStatus("A nova senha deve ter no mínimo 6 caracteres.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordStatus("As senhas não coincidem.");
      return;
    }

    setSavingPassword(true);
    const { error } = await createClient().auth.updateUser({ password: newPassword });
    setPasswordStatus(error ? error.message : "Senha alterada com sucesso.");
    if (!error) {
      setNewPassword("");
      setConfirmPassword("");
    }
    setSavingPassword(false);
  }

  return (
    <>
      <section className="page-section">
        <div className="section-head"><div><h1>Perfil</h1><p>Suas informações pessoais.</p></div></div>
        <div className="admin-field">Foto de perfil<div className="profile-avatar" aria-hidden="true">{initials(name)}</div></div>
        <form onSubmit={handleProfileSubmit} className="admin-form">
          <label className="admin-field">Nome<input value={name} onChange={(event) => setName(event.target.value)} required className="admin-input" /></label>
          <label className="admin-field">E-mail<input value={email} readOnly className="admin-input input-readonly" /><span className="field-hint">O e-mail não pode ser alterado.</span></label>
          <label className="admin-field">Sobre mim<textarea value={bio} onChange={(event) => setBio(event.target.value.slice(0, 500))} maxLength={500} rows={3} placeholder="Conte um pouco sobre você..." className="admin-input" /><span className="field-counter">{bio.length}/500</span></label>
          <div className="form-footer"><button disabled={saving} className="btn">{saving ? <><Loader2 size={14} className="animate-spin" /> Salvando...</> : "Salvar alterações"}</button>{status && <p className="form-status">{status}</p>}</div>
        </form>
      </section>

      <hr className="page-divider" />

      <section className="page-section">
        <div className="section-head"><div><h2>Alterar senha</h2><p>Defina uma nova senha para sua conta.</p></div></div>
        <form onSubmit={handlePasswordSubmit} className="admin-form">
          <label className="admin-field">Nova senha<input required type="password" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} minLength={6} placeholder="Mínimo 6 caracteres" className="admin-input" /></label>
          <label className="admin-field">Confirmar nova senha<input required type="password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} minLength={6} placeholder="Repita a nova senha" className="admin-input" /></label>
          <div className="form-footer"><button disabled={savingPassword} className="btn">{savingPassword ? <><Loader2 size={14} className="animate-spin" /> Alterando...</> : "Alterar senha"}</button>{passwordStatus && <p className="form-status">{passwordStatus}</p>}</div>
        </form>
      </section>
    </>
  );
}
