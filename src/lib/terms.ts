import { createAdminClient } from "@/lib/supabase/admin";
import { sanitizeRichText } from "@/lib/sanitize-rich-text";

export const TERMS_SETTING_KEY = "terms_html";

// Texto usado enquanto o admin não salvar outro em /admin/settings.
const DEFAULT_TERMS_HTML = [
  "<p><strong>Política de Reembolso - Não baixe os arquivos antes de ler com atenção essas informações.</strong></p>",
  "<p>Com base no código de defesa do consumidor, descrito na Lei nº 8.078, todo consumidor tem o direito de solicitar reembolso do produto em casos de compra fora de estabelecimento comercial por qualquer motivo que seja.</p>",
  "<p>Diante disso, a Personal Organizado exerce o direito ao cliente, o prazo de 30 dias de garantia para que você, cliente, solicite o reembolso do produto.</p>",
  "<p>Porém, com base no artigo 38, da Lei nº 8.078, por se tratar de um INFOPRODUTO COM CONSUMO DE NATUREZA IMEDIATA, ou seja, entregue 100% para cópia e download antes dos 30 dias de garantia do produto, informamos que ao consumir o material clicando no link para baixar ou duplicar, você perderá a garantia de reembolso do produto, visto que foi efetivado o download do material e não pode ser devolvido já que o mesmo foi tomado para si na hora do download.</p>",
  "<p><strong>Você pode acessar as aulas, visualizar o modelo, e verificar todas as funções antes de tomar a decisão de duplicar, copiar ou baixar qualquer informação para si.</strong></p>",
  "<p>Caso prossiga com a cópia do material entregue nessa área de membros, você estará concordando com os termos de IMPOSSIBILIDADE DE DEVOLUÇÃO.</p>",
  "<p>Entendendo que ao fazer o download e solicitar reembolso você tomou para si e não te cabe o direito de ser reembolsado. Seria o mesmo que comprar um alimento, comê-lo solicitar reembolso parcial ou cheio do valor pago pelo produto. (Isso significa entrega de natureza imediata).</p>",
  "<p>Caso insista após ter tomado para si os materiais da Área de Membros e concordado com este termo, caberá assim ação judicial por parte do nosso setor jurídico. DECRETO - LEI Nº 2.848, DE 7 DE DEZEMBRO de 1940 Art. 171 - Obter, para si ou para outrem, vantagem ilícita, em prejuízo alheio, induzindo ou mantendo alguém em erro, mediante artifício, ardil, ou qualquer outro meio fraudulento.</p>",
  "<p>A Área de Membros onde você está lendo esse texto, mantém o histórico de todas as ações realizadas aqui dentro, bem como as informações sobre início de sessão, aula ou tópicos clicados, links externos visitados, toda movimentação realizada aqui dentro e no template é registrado e vinculado ao seu usuário.</p>",
  "<p>Se você não atender às condições acima, e desejar solicitar o cancelamento da sua compra por qualquer motivo, entre em contato com nossa equipe de suporte em até 30 dias contados a partir da compra.</p>",
  "<p>Observação: Compras feitas no cartão de crédito, o valor da compra será estornado na próxima fatura do seu cartão ou na fatura do mês subsequente, podendo levar de 30 à 60 dias.</p>",
].join("");

export async function getTermsHtml() {
  const { data } = await createAdminClient().from("app_settings").select("value").eq("key", TERMS_SETTING_KEY).maybeSingle();
  return sanitizeRichText(data?.value) ?? DEFAULT_TERMS_HTML;
}
