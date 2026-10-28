import Link from "next/link";
import { ArrowLeft, ExternalLink } from "lucide-react";

import { deleteLesson, saveLesson } from "@/app/admin/actions";
import { ConfirmDeleteForm } from "@/components/ConfirmDeleteForm";
import { LessonFilesField } from "@/components/LessonFilesField";
import { RichTextEditor } from "@/components/RichTextEditor";

interface LessonFormProps {
  product: { id: string; name: string; slug: string | null };
  modules: { id: string; title: string }[];
  lesson?: { id: string; module_id: string; title: string; position: number; description: string | null; video_url: string | null };
  files: { file_name: string; file_url: string }[];
  defaultModuleId: string;
  defaultPosition: number;
}

// Tela única para criar e editar aula: título, módulo, texto formatado, vídeo e arquivos são salvos juntos.
export function LessonForm({ product, modules, lesson, files, defaultModuleId, defaultPosition }: LessonFormProps) {
  const productPath = `/admin/products/${product.id}`;
  return (
    <main className="admin-page">
      <div className="admin-wrap">
        <Link href={productPath} className="back-link"><ArrowLeft size={14} /> {product.name}</Link>
        <div className="section-head" style={{ marginBottom: 24 }}>
          <div><h1>{lesson ? "Editar aula" : "Nova aula"}</h1><p>{lesson ? lesson.title : product.name}</p></div>
          {lesson && product.slug && <Link href={`/products/${product.slug}/lessons/${lesson.id}`} target="_blank" className="btn btn--outline">Visualizar como aluno <ExternalLink size={13} /></Link>}
        </div>

        <form id="lesson-form" action={saveLesson}>
          <input type="hidden" name="product_id" value={product.id} />
          {lesson && <input type="hidden" name="lesson_id" value={lesson.id} />}

          <section className="settings-section">
            <div className="settings-section__intro"><h2>Aula</h2><p>Título, módulo e ordem da aula. Trocar o módulo move a aula para ele.</p></div>
            <div className="panel form-grid">
              <label className="admin-field span-2">Título<input name="title" required defaultValue={lesson?.title ?? ""} className="admin-input" /></label>
              <label className="admin-field">Módulo<select name="module_id" required defaultValue={lesson?.module_id ?? defaultModuleId} className="admin-input">{modules.map((module) => <option key={module.id} value={module.id}>{module.title}</option>)}</select></label>
              <label className="admin-field">Posição<input name="position" type="number" defaultValue={lesson?.position ?? defaultPosition} className="admin-input" /></label>
            </div>
          </section>

          <section className="settings-section">
            <div className="settings-section__intro"><h2>Texto</h2><p>Aparece abaixo do vídeo. Use negrito, cores e links para destacar o que importa.</p></div>
            <div className="panel"><RichTextEditor name="description" defaultValue={lesson?.description} /></div>
          </section>

          <section className="settings-section">
            <div className="settings-section__intro"><h2>Vídeo</h2><p>Link do YouTube. Ele é convertido automaticamente para o player.</p></div>
            <div className="panel"><label className="admin-field">URL do vídeo<input name="video_url" type="url" defaultValue={lesson?.video_url ?? ""} className="admin-input" placeholder="https://www.youtube.com/watch?v=..." /></label></div>
          </section>

          <section className="settings-section">
            <div className="settings-section__intro"><h2>Arquivos</h2><p>Materiais para download, na ordem em que aparecem para o aluno.</p></div>
            <div className="panel"><LessonFilesField initialFiles={files} /></div>
          </section>
        </form>

        <div className="settings-footer settings-footer--split">
          <div>{lesson && <ConfirmDeleteForm action={deleteLesson} fields={{ product_id: product.id, lesson_id: lesson.id }} label="Excluir aula" message={`Excluir a aula "${lesson.title}"?`} variant="button" />}</div>
          <div className="settings-footer__actions">
            <Link href={productPath} className="btn btn--ghost">Cancelar</Link>
            <button form="lesson-form" name="intent" value="save_and_new" className="btn btn--outline">Salvar e criar outra</button>
            <button form="lesson-form" name="intent" value="save" className="btn">Salvar</button>
          </div>
        </div>
      </div>
    </main>
  );
}
