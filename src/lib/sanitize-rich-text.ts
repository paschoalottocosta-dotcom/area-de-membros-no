import sanitizeHtml from "sanitize-html";

import { toRichTextHtml } from "@/lib/rich-text";

// Só as marcações que o editor do admin produz; qualquer outra coisa (scripts, eventos, estilos) é removida.
export function sanitizeRichText(value: string | null | undefined) {
  const clean = sanitizeHtml(toRichTextHtml(value), {
    allowedTags: ["p", "br", "strong", "em", "u", "s", "a", "span", "ul", "ol", "li", "h2", "h3", "blockquote"],
    allowedAttributes: { a: ["href", "target", "rel"], span: ["style"] },
    allowedStyles: { span: { color: [/^#[0-9a-f]{3,8}$/i, /^rgba?\([\d\s.,%]+\)$/i] } },
    allowedSchemes: ["http", "https", "mailto"],
    transformTags: { a: sanitizeHtml.simpleTransform("a", { target: "_blank", rel: "noopener noreferrer" }) },
  }).trim();
  // O editor vazio gera "<p></p>"; trata como sem texto.
  return clean.replace(/<p>\s*<\/p>/g, "").trim() ? clean : null;
}
