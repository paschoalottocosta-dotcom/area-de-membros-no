"use client";

import { Trash2 } from "lucide-react";
import { useFormStatus } from "react-dom";

function SubmitButton({ label, variant }: { label: string; variant: "link" | "button" }) {
  const { pending } = useFormStatus();
  return <button type="submit" disabled={pending} className={variant === "button" ? "btn btn--outline text-destructive" : "admin-action-link text-destructive"}><Trash2 size={13} /> {pending ? "Excluindo..." : label}</button>;
}

export function ConfirmDeleteForm({ action, fields, label, message, variant = "link" }: { action: (formData: FormData) => Promise<void>; fields: Record<string, string>; label: string; message: string; variant?: "link" | "button" }) {
  return (
    <form action={action} className="inline" onSubmit={(event) => { if (!window.confirm(message)) event.preventDefault(); }}>
      {Object.entries(fields).map(([name, fieldValue]) => <input key={name} type="hidden" name={name} value={fieldValue} />)}
      <SubmitButton label={label} variant={variant} />
    </form>
  );
}
