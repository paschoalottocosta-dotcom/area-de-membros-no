# Área de Membros

Projeto Next.js com App Router, TypeScript, Tailwind CSS, Supabase Auth/Database e Resend.

## Rodar localmente

1. Instale Node.js 20+.
2. Instale as dependências: `npm install`.
3. Copie `.env.local.example` para `.env.local` e preencha as credenciais do Supabase e Resend.
4. Execute `npm run dev` e abra `http://localhost:3000`.

O dashboard consulta `products` e `user_access` para o usuário autenticado. Configure as policies (RLS) dessas tabelas no Supabase. O webhook provisório recebe `POST` em `/api/webhooks/yampi` e registra o payload no console.
