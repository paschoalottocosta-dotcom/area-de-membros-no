import { Loader2 } from "lucide-react";

// Aparece na hora do clique enquanto a próxima página carrega (arquivos loading.tsx).
export function PageLoading() {
  return (
    <div className="page-loading" role="status" aria-label="Carregando">
      <Loader2 size={22} className="animate-spin" />
    </div>
  );
}
