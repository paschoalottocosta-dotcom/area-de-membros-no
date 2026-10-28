import { randomBytes } from "node:crypto";

import { createAdminClient } from "@/lib/supabase/admin";
import { sendWelcomeEmail } from "@/lib/welcome-email";

export interface GrantAccessInput {
  email: string;
  name: string;
  productIds: string[];
}

interface ProductRow {
  id: string;
  slug: string | null;
}

interface UserAccessRow {
  product_id: string;
  status: "active" | "disabled";
}

// listUsers devolve no máximo uma página por vez (padrão 50), então percorre todas as páginas;
// sem isso, um cliente antigo não seria encontrado e a segunda compra falharia ao tentar recriá-lo.
async function findUserByEmail(adminSupabase: ReturnType<typeof createAdminClient>, email: string) {
  const perPage = 1000;
  for (let page = 1; ; page++) {
    const { data, error } = await adminSupabase.auth.admin.listUsers({ page, perPage });
    if (error) throw new Error(`Não foi possível consultar o usuário: ${error.message}`);
    const found = data.users.find((candidate) => candidate.email?.trim().toLowerCase() === email);
    if (found) return found;
    if (data.users.length < perPage) return null;
  }
}

// Pode ser chamada de novo para a mesma compra (a Yampi reenvia o webhook quando recebe erro):
// cada passo confere o que já foi feito antes de agir.
export async function grantAccess({ email, name, productIds: requestedProductIds }: GrantAccessInput) {
  const normalizedEmail = email.trim().toLowerCase();
  const normalizedName = name.trim();
  const normalizedProductIds = [...new Set(requestedProductIds.map((id) => id.trim()).filter(Boolean))];

  if (!normalizedEmail) {
    throw new Error("E-mail é obrigatório para conceder acesso.");
  }

  const adminSupabase = createAdminClient();

  // Sem nenhum produto reconhecido não cria a conta: ela ficaria sem acesso e sem e-mail com a senha.
  if (normalizedProductIds.length === 0) {
    return { user: null, createdUser: false, grantedProducts: [] as string[] };
  }

  const { data: products, error: productsError } = await adminSupabase
    .from("products")
    .select("id, slug")
    .in("id", normalizedProductIds);

  if (productsError) {
    throw new Error(`Não foi possível buscar os produtos: ${productsError.message}`);
  }

  const matchingProducts = (products ?? []) as ProductRow[];
  if (matchingProducts.length === 0) {
    return { user: null, createdUser: false, grantedProducts: [] as string[] };
  }

  let user = await findUserByEmail(adminSupabase, normalizedEmail);
  let createdUser = false;
  let password: string | null = null;

  if (!user) {
    password = randomBytes(24).toString("base64url");
    const { data: createdUserResult, error: createUserError } = await adminSupabase.auth.admin.createUser({
      email: normalizedEmail,
      password,
      email_confirm: true,
      user_metadata: {
        name: normalizedName || normalizedEmail.split("@")[0],
      },
    });

    if (createUserError) {
      throw new Error(`Não foi possível criar o usuário: ${createUserError.message}`);
    }

    user = createdUserResult.user;
    createdUser = true;
  }

  if (!user) {
    throw new Error("Usuário não foi encontrado nem criado.");
  }

  // Só cria o perfil se ele não existir; numa segunda compra não pode zerar admin/banido/acesso ilimitado.
  const { error: profileSyncError } = await adminSupabase
    .from("profiles")
    .upsert({ id: user.id }, { onConflict: "id", ignoreDuplicates: true });

  if (profileSyncError) {
    throw new Error(`Não foi possível sincronizar o perfil do usuário: ${profileSyncError.message}`);
  }

  const productIds = matchingProducts.map((product) => product.id);

  const { data: existingAccess, error: accessLookupError } = await adminSupabase
    .from("user_access")
    .select("product_id, status")
    .eq("user_id", user.id)
    .in("product_id", productIds);

  if (accessLookupError) {
    throw new Error(`Não foi possível verificar acessos existentes: ${accessLookupError.message}`);
  }

  const existingAccessRows = (existingAccess ?? []) as UserAccessRow[];
  const grantedProductIds = new Set(existingAccessRows.filter((row) => row.status === "active").map((row) => row.product_id));

  const disabledProductIds = new Set(existingAccessRows.filter((row) => row.status === "disabled").map((row) => row.product_id));
  const productsToReactivate = matchingProducts.filter((product) => disabledProductIds.has(product.id));
  if (productsToReactivate.length > 0) {
    const { error: reactivateError } = await adminSupabase
      .from("user_access")
      .update({ status: "active" })
      .eq("user_id", user.id)
      .in("product_id", productsToReactivate.map((product) => product.id));
    if (reactivateError) throw new Error(`Não foi possível reativar acessos: ${reactivateError.message}`);
  }

  const rowsToInsert = matchingProducts
    .filter((product) => !grantedProductIds.has(product.id) && !disabledProductIds.has(product.id))
    .map((product) => ({
      user_id: user.id,
      product_id: product.id,
      status: "active" as const,
    }));

  if (rowsToInsert.length > 0) {
    const { error: insertError } = await adminSupabase.from("user_access").insert(rowsToInsert);
    if (insertError) {
      throw new Error(`Não foi possível registrar os acessos: ${insertError.message}`);
    }
  }

  // Conta que já existia mas nunca entrou (ex.: uma tentativa anterior criou a conta e falhou
  // antes do e-mail): gera uma senha nova e envia, senão o aluno ficaria sem como entrar.
  if (!createdUser && !user.last_sign_in_at) {
    password = randomBytes(24).toString("base64url");
    const { error: passwordError } = await adminSupabase.auth.admin.updateUserById(user.id, { password });
    if (passwordError) throw new Error(`Não foi possível gerar a senha do usuário: ${passwordError.message}`);
  }

  if (password) {
    await sendWelcomeEmail({ email: normalizedEmail, name: normalizedName || normalizedEmail.split("@")[0], password });
  }

  return {
    user,
    createdUser,
    grantedProducts: matchingProducts.map((product) => product.slug ?? product.id),
  };
}
