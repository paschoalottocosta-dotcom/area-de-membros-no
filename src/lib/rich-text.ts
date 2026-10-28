function escapeHtml(text: string) {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

// Descrições antigas (antes do editor) são texto puro: vira HTML com parágrafos, quebras de linha e links clicáveis.
export function toRichTextHtml(value: string | null | undefined) {
  if (!value) return "";
  if (/<\/?(p|br|strong|em|u|s|a|span|ul|ol|li|h2|h3|blockquote)\b/i.test(value)) return value;
  return value
    .split(/\n{2,}/)
    .map((paragraph) => `<p>${escapeHtml(paragraph)
      .replace(/(https?:\/\/[^\s<]+)/g, '<a href="$1" target="_blank" rel="noopener noreferrer">$1</a>')
      .replace(/\n/g, "<br>")}</p>`)
    .join("");
}
