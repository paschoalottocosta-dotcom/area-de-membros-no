import type { SupabaseClient } from "@supabase/supabase-js";

// Arquivos enviados pelo admin ficam no bucket privado e são gravados em lesson_files.file_url
// como "storage:<caminho>"; links externos (Google Drive, Canva...) continuam como https://.
export const LESSON_FILES_BUCKET = "lesson-files";
export const STORAGE_PREFIX = "storage:";
export const MAX_LESSON_FILE_BYTES = 50 * 1024 * 1024;

export function storedFilePath(fileUrl: string) {
  return fileUrl.startsWith(STORAGE_PREFIX) ? fileUrl.slice(STORAGE_PREFIX.length) : null;
}

// Nome original do arquivo (o caminho é "<pasta aleatória>/<nome>").
export function storedFileName(fileUrl: string) {
  return storedFilePath(fileUrl)?.split("/").pop() ?? "";
}

// Apaga do bucket os arquivos que não são mais usados por nenhuma aula.
export async function removeStoredFiles(adminSupabase: SupabaseClient, fileUrls: string[]) {
  const paths = fileUrls.map(storedFilePath).filter((path): path is string => Boolean(path));
  if (paths.length === 0) return;
  const { error } = await adminSupabase.storage.from(LESSON_FILES_BUCKET).remove(paths);
  if (error) console.error("Não foi possível apagar arquivos antigos do bucket:", error.message);
}
