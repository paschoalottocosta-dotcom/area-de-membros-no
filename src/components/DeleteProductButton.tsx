"use client";

import { Trash2 } from "lucide-react";
import { useFormStatus } from "react-dom";

export function DeleteProductButton({ productId, action }: { productId: string; action: (formData: FormData) => Promise<void> }) {
  return (
    <form action={action} className="inline" onSubmit={(event) => {
      if (!window.confirm("Tem certeza?")) {
        event.preventDefault();
      }
    }}>
      <input type="hidden" name="product_id" value={productId} />
      <button type="submit" className="admin-action-link text-destructive">
        <Trash2 size={15} /> Excluir
      </button>
    </form>
  );
}
