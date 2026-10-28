"use client";

import { Color, TextStyle } from "@tiptap/extension-text-style";
import { EditorContent, useEditor, useEditorState } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { Bold, Heading2, Italic, Link2, List, ListOrdered, Palette, Redo2, RemoveFormatting, Strikethrough, Underline, Undo2, Unlink } from "lucide-react";
import { useState, type ReactNode } from "react";

import { toRichTextHtml } from "@/lib/rich-text";

// Cores legíveis tanto no tema escuro quanto no claro.
const COLORS = [
  { label: "Laranja", value: "#f97316" },
  { label: "Vermelho", value: "#ef4444" },
  { label: "Amarelo", value: "#eab308" },
  { label: "Verde", value: "#22c55e" },
  { label: "Azul", value: "#3b82f6" },
  { label: "Roxo", value: "#a855f7" },
  { label: "Rosa", value: "#ec4899" },
];

function ToolbarButton({ label, active, disabled, onClick, children }: { label: string; active?: boolean; disabled?: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button type="button" title={label} aria-label={label} aria-pressed={active} disabled={disabled} onMouseDown={(event) => event.preventDefault()} onClick={onClick} className={`rich-editor__button ${active ? "rich-editor__button--active" : ""}`}>
      {children}
    </button>
  );
}

export function RichTextEditor({ name, defaultValue, minHeight = 180 }: { name: string; defaultValue?: string | null; minHeight?: number }) {
  const initialHtml = toRichTextHtml(defaultValue);
  const [html, setHtml] = useState(initialHtml);
  const [showColors, setShowColors] = useState(false);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3] },
        code: false,
        codeBlock: false,
        horizontalRule: false,
        link: { openOnClick: false, autolink: true, defaultProtocol: "https" },
      }),
      TextStyle,
      Color,
    ],
    content: initialHtml,
    immediatelyRender: false,
    editorProps: { attributes: { class: "rich-text rich-editor__content", style: `min-height: ${minHeight}px` } },
    onUpdate: ({ editor: current }) => setHtml(current.getHTML()),
  });

  const state = useEditorState({
    editor,
    selector: ({ editor: current }) => current ? {
      bold: current.isActive("bold"),
      italic: current.isActive("italic"),
      underline: current.isActive("underline"),
      strike: current.isActive("strike"),
      heading: current.isActive("heading", { level: 2 }),
      bulletList: current.isActive("bulletList"),
      orderedList: current.isActive("orderedList"),
      link: current.isActive("link"),
      color: current.getAttributes("textStyle").color as string | undefined,
      canUndo: current.can().undo(),
      canRedo: current.can().redo(),
    } : null,
  });

  function setLink() {
    if (!editor) return;
    const previous = editor.getAttributes("link").href as string | undefined;
    const url = window.prompt("Endereço do link (ex: https://...)", previous ?? "https://");
    if (url === null) return;
    if (!url.trim()) {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
      return;
    }
    const href = /^(https?:\/\/|mailto:)/i.test(url.trim()) ? url.trim() : `https://${url.trim()}`;
    if (editor.state.selection.empty && !editor.isActive("link")) {
      editor.chain().focus().insertContent({ type: "text", text: href, marks: [{ type: "link", attrs: { href } }] }).run();
    } else {
      editor.chain().focus().extendMarkRange("link").setLink({ href }).run();
    }
  }

  return (
    <div className="rich-editor">
      <input type="hidden" name={name} value={html} />
      <div className="rich-editor__toolbar" role="toolbar" aria-label="Formatação do texto">
        <ToolbarButton label="Negrito" active={state?.bold} onClick={() => editor?.chain().focus().toggleBold().run()}><Bold size={15} /></ToolbarButton>
        <ToolbarButton label="Itálico" active={state?.italic} onClick={() => editor?.chain().focus().toggleItalic().run()}><Italic size={15} /></ToolbarButton>
        <ToolbarButton label="Sublinhado" active={state?.underline} onClick={() => editor?.chain().focus().toggleUnderline().run()}><Underline size={15} /></ToolbarButton>
        <ToolbarButton label="Riscado" active={state?.strike} onClick={() => editor?.chain().focus().toggleStrike().run()}><Strikethrough size={15} /></ToolbarButton>
        <div className="rich-editor__color">
          <ToolbarButton label="Cor do texto" active={Boolean(state?.color) || showColors} onClick={() => setShowColors((open) => !open)}>
            <Palette size={15} style={state?.color ? { color: state.color } : undefined} />
          </ToolbarButton>
          {showColors && (
            <div className="rich-editor__palette">
              {COLORS.map((color) => (
                <button key={color.value} type="button" title={color.label} aria-label={color.label} onMouseDown={(event) => event.preventDefault()} onClick={() => { editor?.chain().focus().setColor(color.value).run(); setShowColors(false); }} className="rich-editor__swatch" style={{ background: color.value }} />
              ))}
              <button type="button" onMouseDown={(event) => event.preventDefault()} onClick={() => { editor?.chain().focus().unsetColor().run(); setShowColors(false); }} className="rich-editor__swatch-reset">Padrão</button>
            </div>
          )}
        </div>
        <span className="rich-editor__divider" />
        <ToolbarButton label="Título" active={state?.heading} onClick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()}><Heading2 size={15} /></ToolbarButton>
        <ToolbarButton label="Lista" active={state?.bulletList} onClick={() => editor?.chain().focus().toggleBulletList().run()}><List size={15} /></ToolbarButton>
        <ToolbarButton label="Lista numerada" active={state?.orderedList} onClick={() => editor?.chain().focus().toggleOrderedList().run()}><ListOrdered size={15} /></ToolbarButton>
        <span className="rich-editor__divider" />
        <ToolbarButton label="Inserir link" active={state?.link} onClick={setLink}><Link2 size={15} /></ToolbarButton>
        <ToolbarButton label="Remover link" disabled={!state?.link} onClick={() => editor?.chain().focus().extendMarkRange("link").unsetLink().run()}><Unlink size={15} /></ToolbarButton>
        <ToolbarButton label="Limpar formatação" onClick={() => editor?.chain().focus().unsetAllMarks().clearNodes().run()}><RemoveFormatting size={15} /></ToolbarButton>
        <span className="rich-editor__divider" />
        <ToolbarButton label="Desfazer" disabled={!state?.canUndo} onClick={() => editor?.chain().focus().undo().run()}><Undo2 size={15} /></ToolbarButton>
        <ToolbarButton label="Refazer" disabled={!state?.canRedo} onClick={() => editor?.chain().focus().redo().run()}><Redo2 size={15} /></ToolbarButton>
      </div>
      <EditorContent editor={editor} />
    </div>
  );
}
