"use client";

import { Trash2 } from "lucide-react";
import { useFormStatus } from "react-dom";

function SubmitButton() {
  const { pending } = useFormStatus();
  return <button type="submit" disabled={pending} className="admin-action-link text-destructive"><Trash2 size={15} /> {pending ? "Excluindo..." : "Excluir"}</button>;
}

export function DeleteCategoryButton({ categoryId, action }: { categoryId: string; action: (formData: FormData) => Promise<void> }) {
  return <form action={action} className="inline" onSubmit={(event) => { if (!window.confirm("Excluir esta categoria? Os produtos ficarão sem categoria.")) event.preventDefault(); }}><input type="hidden" name="id" value={categoryId} /><SubmitButton /></form>;
}
