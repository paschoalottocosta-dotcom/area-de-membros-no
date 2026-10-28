"use client";

import { Trash2 } from "lucide-react";
import { useFormStatus } from "react-dom";

function SubmitButton() {
  const { pending } = useFormStatus();
  return <button type="submit" disabled={pending} className="admin-action-link text-destructive"><Trash2 size={15} /> {pending ? "Excluindo..." : "Excluir combo"}</button>;
}

export function DeleteComboButton({ comboId, action }: { comboId: string; action: (formData: FormData) => Promise<void> }) {
  return <form action={action} className="inline" onSubmit={(event) => { if (!window.confirm("Excluir este combo? Quem já comprou continua com acesso aos produtos.")) event.preventDefault(); }}><input type="hidden" name="id" value={comboId} /><SubmitButton /></form>;
}
