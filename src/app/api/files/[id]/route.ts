import { NextResponse } from "next/server";

import { LESSON_FILES_BUCKET, storedFileName, storedFilePath } from "@/lib/lesson-files";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

// Download de material da aula: a consulta usa a sessão do aluno, então as regras do banco (RLS)
// só devolvem o arquivo se ele tiver acesso ativo ao produto e não estiver banido.
// O link gerado para o bucket privado vale só 60 segundos.
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.redirect(new URL("/login", request.url));

  const { data: file } = await supabase.from("lesson_files").select("file_name, file_url").eq("id", id).maybeSingle();
  if (!file) return NextResponse.json({ error: "Arquivo não encontrado ou sem acesso." }, { status: 404 });

  const path = storedFilePath(file.file_url);
  if (!path) return NextResponse.redirect(file.file_url);

  const extension = storedFileName(file.file_url).match(/\.[a-z0-9]+$/)?.[0] ?? "";
  const { data, error } = await createAdminClient().storage.from(LESSON_FILES_BUCKET).createSignedUrl(path, 60, { download: `${file.file_name}${extension}` });
  if (error || !data) return NextResponse.json({ error: "Não foi possível gerar o download." }, { status: 500 });
  return NextResponse.redirect(data.signedUrl);
}
