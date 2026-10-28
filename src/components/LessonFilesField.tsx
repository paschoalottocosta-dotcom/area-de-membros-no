"use client";

import { ArrowDown, ArrowUp, FileText, Link2, Loader2, Plus, Trash2, Upload } from "lucide-react";
import { useRef, useState, type ChangeEvent } from "react";

import { createLessonFileUpload } from "@/app/admin/actions";
import { LESSON_FILES_BUCKET, MAX_LESSON_FILE_BYTES, STORAGE_PREFIX, storedFileName } from "@/lib/lesson-files";
import { createClient } from "@/lib/supabase/client";

interface FileRow { key: number; name: string; url: string; mode: "upload" | "link"; uploading?: boolean; error?: string; }

const ACCEPTED_FILES = ".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.zip,.rar";

// Os arquivos são salvos junto com a aula: cada linha vira um par file_name/file_url no formulário.
// O arquivo é enviado na hora em que é escolhido; o "Salvar" da aula só grava a lista.
export function LessonFilesField({ initialFiles }: { initialFiles: { file_name: string; file_url: string }[] }) {
  const [rows, setRows] = useState<FileRow[]>(() => initialFiles.map((file, index) => ({ key: index, name: file.file_name, url: file.file_url, mode: file.file_url.startsWith(STORAGE_PREFIX) ? "upload" : "link" })));
  const [nextKey, setNextKey] = useState(initialFiles.length);
  const inputRefs = useRef(new Map<number, HTMLInputElement>());

  function update(key: number, changes: Partial<FileRow>) {
    setRows((current) => current.map((row) => (row.key === key ? { ...row, ...changes } : row)));
  }

  function move(index: number, direction: -1 | 1) {
    setRows((current) => {
      const target = index + direction;
      if (target < 0 || target >= current.length) return current;
      const copy = [...current];
      [copy[index], copy[target]] = [copy[target], copy[index]];
      return copy;
    });
  }

  function addRow(mode: FileRow["mode"]) {
    const key = nextKey;
    setRows((current) => [...current, { key, name: "", url: "", mode }]);
    setNextKey(key + 1);
    if (mode === "upload") setTimeout(() => inputRefs.current.get(key)?.click(), 0);
  }

  async function handleFile(row: FileRow, event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (file.size > MAX_LESSON_FILE_BYTES) return update(row.key, { error: "O arquivo passa de 50 MB." });

    const suggestedName = row.name || file.name.replace(/\.[^.]+$/, "");
    update(row.key, { uploading: true, error: "", name: suggestedName });
    try {
      const { path, token } = await createLessonFileUpload(file.name);
      const { error } = await createClient().storage.from(LESSON_FILES_BUCKET).uploadToSignedUrl(path, token, file, { contentType: file.type || undefined });
      if (error) throw new Error(error.message);
      update(row.key, { uploading: false, url: `${STORAGE_PREFIX}${path}` });
    } catch (error) {
      update(row.key, { uploading: false, error: `Falha no envio: ${error instanceof Error ? error.message : "tente novamente"}` });
    }
  }

  return (
    <div className="lesson-files-field">
      {rows.map((row, index) => (
        <div key={row.key} className="lesson-files-field__row">
          <label className="admin-field">Nome do arquivo<input name="file_name" required value={row.name} onChange={(event) => update(row.key, { name: event.target.value })} className="admin-input" /></label>
          {row.mode === "upload" ? (
            <div className="admin-field">
              Arquivo
              <input type="hidden" name="file_url" value={row.url} />
              <input ref={(element) => { if (element) inputRefs.current.set(row.key, element); else inputRefs.current.delete(row.key); }} type="file" accept={ACCEPTED_FILES} onChange={(event) => handleFile(row, event)} hidden />
              <div className="lesson-files-field__file">
                {row.uploading ? <><Loader2 size={14} className="animate-spin" /><span>Enviando...</span></>
                  : row.url ? <><FileText size={14} /><span>{storedFileName(row.url)}</span></>
                  : <span className="muted">Nenhum arquivo enviado</span>}
                <button type="button" disabled={row.uploading} onClick={() => inputRefs.current.get(row.key)?.click()} className="btn btn--outline lesson-files-field__pick"><Upload size={13} /> {row.url ? "Trocar" : "Escolher"}</button>
              </div>
              {row.error && <span className="field-hint text-destructive">{row.error}</span>}
            </div>
          ) : (
            <label className="admin-field">Link do arquivo<input name="file_url" type="url" required value={row.url} onChange={(event) => update(row.key, { url: event.target.value })} className="admin-input" placeholder="https://..." /></label>
          )}
          <div className="lesson-files-field__actions">
            <button type="button" title="Subir" aria-label="Subir" disabled={index === 0} onClick={() => move(index, -1)} className="rich-editor__button"><ArrowUp size={14} /></button>
            <button type="button" title="Descer" aria-label="Descer" disabled={index === rows.length - 1} onClick={() => move(index, 1)} className="rich-editor__button"><ArrowDown size={14} /></button>
            <button type="button" title="Remover arquivo" aria-label="Remover arquivo" onClick={() => setRows((current) => current.filter((item) => item.key !== row.key))} className="rich-editor__button text-destructive"><Trash2 size={14} /></button>
          </div>
        </div>
      ))}
      {rows.length === 0 && <p className="field-hint" style={{ margin: 0 }}>Nenhum arquivo nesta aula.</p>}
      <div className="lesson-files-field__add">
        <button type="button" onClick={() => addRow("upload")} className="btn btn--outline"><Plus size={14} /> Enviar arquivo do computador</button>
        <button type="button" onClick={() => addRow("link")} className="btn btn--outline"><Link2 size={14} /> Adicionar link</button>
      </div>
      <p className="field-hint" style={{ margin: 0 }}>PDF, Word, Excel, PowerPoint ou ZIP, até 50 MB. Use &quot;Adicionar link&quot; para planilhas do Google, templates do Canva etc.</p>
    </div>
  );
}
