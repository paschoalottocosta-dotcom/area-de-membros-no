// Texto dos Termos e condições de uso (editado em /admin/settings), exibido no pop-up do primeiro acesso e no perfil.
export function TermsContent({ html }: { html: string }) {
  return <div className="terms-content rich-text" dangerouslySetInnerHTML={{ __html: html }} />;
}
