@AGENTS.md

# Contexto do projeto

## Sobre o dono
- É leigo em programação: dar instruções bem passo a passo.
- Sempre avisar quando for hora de fazer **commit + Sync Changes** no GitHub.
- Sempre que uma mudança exigir migration SQL, dizer explicitamente que é preciso **copiar o arquivo e rodar no SQL Editor do Supabase** (migrations não são aplicadas automaticamente).
- Nunca colar chaves ou segredos no chat; ficam só no `.env.local` e nas variáveis de ambiente da Vercel.

## Objetivo
Área de membros própria para vender produtos digitais (planilhas, cursos, templates, ebooks), substituindo a Memberkit.
Fluxo: compra na Yampi (pagamento via Mercado Pago) → webhook → cria usuário → libera produto → envia e-mail com login e senha.

## Stack
Next.js (App Router, TypeScript, Tailwind v4), Supabase (Auth, Postgres, Storage), Resend (e-mail), Vercel (deploy automático a cada push no GitHub), domínio na Hostinger.

## Banco (migrations em `supabase/migrations`)
- `products` (name, slug, is_bundle, yampi_product_id — guarda o **SKU ID** da Yampi, is_visible, sales_url, cover_image_url, category_id)
- `categories`, `modules`, `lessons` (title, description, video_url, position), `lesson_files`
- `user_access` (user_id, product_id, status active/disabled)
- `profiles` (is_admin, blocked, unlimited_access, bio)
- RLS ativado; escrita só via service_role em Server Actions que verificam admin.
- Buckets: `product-covers` (em uso) e `avatars` (sem uso).

## Funcionalidades prontas
- Login; dashboard com produtos agrupados por categoria em carrosséis.
- Produtos sem acesso aparecem trancados e levam à `sales_url`; produto com `is_visible=false` só aparece para quem tem acesso.
- Páginas de produto, módulo e aula (vídeo YouTube com conversão automática para embed, descrição, arquivos, botões aula anterior/próxima).
- `/profile` (nome, bio, trocar senha).
- Painel `/admin`: produtos, categorias e membros (banir, acesso ilimitado, status por produto, reenviar senha, editar e-mail, definir nova senha manualmente).
- Webhook `/api/webhooks/yampi` com verificação HMAC-SHA256 (`YAMPI_WEBHOOK_SECRET`), evento `order.paid`, casando por `sku_id`; bundle libera tudo.
- E-mail de boas-vindas com senha aleatória; remetente "Personal Organizado <acesso@personalorganizado.com.br>" (domínio verificado no Resend), reply-to personalorganizado2025@gmail.com.
- Visual: tema escuro neutro (Tweakcn), fonte Poppins, sidebar fixa (bottom bar no mobile).
- Referência visual: outra área de membros do dono ("Criar & Vender") — sidebar, carrosséis por categoria com setas alinhadas à direita na linha do título, capas 300x420, produto trancado com overlay escuro e cadeado branco.

## Estado de produção
- Site publicado na Vercel (`.vercel.app`).
- O webhook da Yampi para esta área está **DESATIVADO de propósito** até a área ficar pronta; os webhooks "- MemberKit" continuam ativos atendendo clientes reais. **Não reativar nada sem o dono pedir.**

## Últimos pedidos
1. Reduzir o tamanho dos títulos em todas as páginas (a tela de aula ainda tinha título gigante).
2. Responsividade mobile: elementos grandes demais.
3. Em `/admin/members/[id]`, permitir editar o e-mail e definir manualmente uma nova senha do aluno (além do "Reenviar senha"). — **feito** (`updateMemberEmail` / `updateMemberPassword` em `src/app/admin/actions.ts`).

## Pendências
- Cadastrar o restante do catálogo (só 1 de 8 produtos tem conteúdo).
- Testar Order Bump (produto principal + OB liberando os dois).
- Editar módulo/aula/arquivo no admin (tentativa anterior ficou confusa e foi revertida; baixa prioridade).
- Conectar domínio próprio (CNAME na Hostinger apontando para `cname.vercel-dns.com`).
- Alguns vídeos do YouTube precisam da opção "Permitir incorporação" ativada.

## Aviso
O projeto Supabase é do plano gratuito e pausa por inatividade. Se der erro de conexão, clicar em "Resume project" no painel do Supabase.
