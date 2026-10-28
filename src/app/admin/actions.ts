"use server";

import { randomBytes } from "node:crypto";
import { revalidatePath, revalidateTag } from "next/cache";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { BRAND_CACHE_TAG, BRAND_SETTING_KEYS } from "@/lib/brand";
import { LESSON_FILES_BUCKET, removeStoredFiles } from "@/lib/lesson-files";
import { requireAdmin } from "@/lib/supabase/admin-auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { sanitizeRichText } from "@/lib/sanitize-rich-text";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { TERMS_SETTING_KEY } from "@/lib/terms";
import { sendWelcomeEmail } from "@/lib/welcome-email";

function value(formData: FormData, name: string) {
  return String(formData.get(name) ?? "").trim();
}

// Guarda uma mensagem curta que o <FlashToast /> do layout mostra no rodapé após a ação.
async function notify(message: string) {
  (await cookies()).set("flash", `${Date.now()}|${message}`, { path: "/", maxAge: 60 });
}

function numberValue(formData: FormData, name: string) {
  const parsed = Number(value(formData, name));
  return Number.isFinite(parsed) ? parsed : 0;
}

function slugify(input: string) {
  return input.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

async function uploadProductCover(adminSupabase: ReturnType<typeof createAdminClient>, productId: string, formData: FormData) {
  const file = formData.get("cover_image");
  if (!(file instanceof File) || file.size === 0) return null;
  if (!file.type.startsWith("image/")) throw new Error("A capa precisa ser uma imagem.");
  if (file.size > 5 * 1024 * 1024) throw new Error("A capa deve ter no máximo 5 MB.");

  const extension = file.name.split(".").pop()?.toLowerCase() || "jpg";
  const path = `${productId}/${Date.now()}-${randomBytes(6).toString("hex")}.${extension}`;
  const { error } = await adminSupabase.storage.from("product-covers").upload(path, file, {
    contentType: file.type,
    upsert: false,
  });
  if (error) throw new Error(`Não foi possível enviar a capa: ${error.message}`);
  return adminSupabase.storage.from("product-covers").getPublicUrl(path).data.publicUrl;
}

// Um mesmo SKU da Yampi não pode estar num produto e num combo: o webhook não saberia qual liberar.
async function assertSkuFree(adminSupabase: ReturnType<typeof createAdminClient>, sku: string, ignore: { productId?: string; comboId?: string }) {
  if (!sku) return;
  let productQuery = adminSupabase.from("products").select("name").eq("yampi_product_id", sku);
  if (ignore.productId) productQuery = productQuery.neq("id", ignore.productId);
  let comboQuery = adminSupabase.from("combos").select("name").eq("yampi_product_id", sku);
  if (ignore.comboId) comboQuery = comboQuery.neq("id", ignore.comboId);
  const [{ data: products, error: productsError }, { data: combos, error: combosError }] = await Promise.all([productQuery.limit(1), comboQuery.limit(1)]);
  if (productsError || combosError) throw new Error("Não foi possível verificar o ID da Yampi.");
  if (products?.[0]) throw new Error(`O ID da Yampi ${sku} já está no produto "${products[0].name}".`);
  if (combos?.[0]) throw new Error(`O ID da Yampi ${sku} já está no combo "${combos[0].name}".`);
}

export async function createProduct(formData: FormData) {
  const { adminSupabase } = await requireAdmin();
  const name = value(formData, "name");
  const slug = slugify(value(formData, "slug") || name);
  if (!name || !slug) throw new Error("Nome e slug são obrigatórios.");
  await assertSkuFree(adminSupabase, value(formData, "yampi_product_id"), {});

  // Produto novo entra no fim da vitrine; a ordem é ajustada arrastando os cards no Início.
  const { data: lastProduct } = await adminSupabase.from("products").select("position").order("position", { ascending: false }).limit(1).maybeSingle();
  const { data: product, error } = await adminSupabase.from("products").insert({
    name,
    slug,
    position: (lastProduct?.position ?? 0) + 1,
    is_bundle: false,
    is_visible: formData.get("is_visible") !== "off",
    sales_url: value(formData, "sales_url") || null,
    yampi_product_id: value(formData, "yampi_product_id") || null,
    category_id: value(formData, "category_id") || null,
  }).select("id").single();
  if (error || !product) throw new Error(`Não foi possível criar o produto: ${error?.message ?? "produto não retornado"}`);
  const coverImageUrl = await uploadProductCover(adminSupabase, product.id, formData);
  if (coverImageUrl) {
    const { error: coverError } = await adminSupabase.from("products").update({ cover_image_url: coverImageUrl }).eq("id", product.id);
    if (coverError) throw new Error(`Não foi possível salvar a capa: ${coverError.message}`);
  }
  await notify("Produto criado.");
  revalidatePath("/admin/products");
  redirect("/admin/products");
}

export async function updateProduct(formData: FormData) {
  const { adminSupabase } = await requireAdmin();
  const id = value(formData, "id");
  const name = value(formData, "name");
  const slug = slugify(value(formData, "slug") || name);
  if (!id || !name || !slug) throw new Error("Nome e slug são obrigatórios.");
  await assertSkuFree(adminSupabase, value(formData, "yampi_product_id"), { productId: id });

  const coverImageUrl = await uploadProductCover(adminSupabase, id, formData);
  const { error } = await adminSupabase.from("products").update({
    name,
    slug,
    is_visible: formData.get("is_visible") === "on",
    sales_url: value(formData, "sales_url") || null,
    yampi_product_id: value(formData, "yampi_product_id") || null,
    category_id: value(formData, "category_id") || null,
    ...(coverImageUrl ? { cover_image_url: coverImageUrl } : {}),
  }).eq("id", id);
  if (error) throw new Error(`Não foi possível atualizar o produto: ${error.message}`);
  await notify("Produto salvo.");
  revalidatePath("/admin/products");
  revalidatePath(`/admin/products/${id}`);
}

async function saveComboItems(adminSupabase: ReturnType<typeof createAdminClient>, comboId: string, formData: FormData) {
  const productIds = [...new Set(formData.getAll("product_id").map((id) => String(id).trim()).filter(Boolean))];
  const { error: deleteError } = await adminSupabase.from("combo_items").delete().eq("combo_id", comboId);
  if (deleteError) throw new Error(`Não foi possível salvar os produtos do combo: ${deleteError.message}`);
  if (productIds.length === 0) return;
  const { error: insertError } = await adminSupabase.from("combo_items").insert(productIds.map((productId) => ({ combo_id: comboId, product_id: productId })));
  if (insertError) throw new Error(`Não foi possível salvar os produtos do combo: ${insertError.message}`);
}

export async function createCombo(formData: FormData) {
  const { adminSupabase } = await requireAdmin();
  const name = value(formData, "name");
  const sku = value(formData, "yampi_product_id");
  if (!name || !sku) throw new Error("Nome e ID da Yampi são obrigatórios.");
  await assertSkuFree(adminSupabase, sku, {});

  const { data: combo, error } = await adminSupabase.from("combos").insert({ name, yampi_product_id: sku }).select("id").single();
  if (error || !combo) throw new Error(`Não foi possível criar o combo: ${error?.message ?? "combo não retornado"}`);
  await saveComboItems(adminSupabase, combo.id, formData);
  await notify("Combo criado.");
  revalidatePath("/admin/combos");
  redirect("/admin/combos");
}

export async function updateCombo(formData: FormData) {
  const { adminSupabase } = await requireAdmin();
  const id = value(formData, "id");
  const name = value(formData, "name");
  const sku = value(formData, "yampi_product_id");
  if (!id || !name || !sku) throw new Error("Nome e ID da Yampi são obrigatórios.");
  await assertSkuFree(adminSupabase, sku, { comboId: id });

  const { error } = await adminSupabase.from("combos").update({ name, yampi_product_id: sku }).eq("id", id);
  if (error) throw new Error(`Não foi possível atualizar o combo: ${error.message}`);
  await saveComboItems(adminSupabase, id, formData);
  await notify("Combo salvo.");
  revalidatePath("/admin/combos");
}

export async function deleteCombo(formData: FormData) {
  const { adminSupabase } = await requireAdmin();
  const id = value(formData, "id");
  if (!id) throw new Error("Combo inválido.");
  const { error } = await adminSupabase.from("combos").delete().eq("id", id);
  if (error) throw new Error(`Não foi possível excluir o combo: ${error.message}`);
  await notify("Combo excluído.");
  revalidatePath("/admin/combos");
  redirect("/admin/combos");
}

// Arquivos enviados ao bucket por aulas de um produto, módulo ou aula (para apagar junto ao excluir).
async function storedFileUrls(adminSupabase: ReturnType<typeof createAdminClient>, scope: { productId?: string; moduleId?: string; lessonId?: string }) {
  let query = adminSupabase.from("lesson_files").select("file_url, lessons!inner(module_id, modules!inner(product_id))").like("file_url", "storage:%");
  if (scope.lessonId) query = query.eq("lesson_id", scope.lessonId);
  else if (scope.moduleId) query = query.eq("lessons.module_id", scope.moduleId);
  else if (scope.productId) query = query.eq("lessons.modules.product_id", scope.productId);
  else return [];
  const { data, error } = await query;
  if (error) console.error("Não foi possível listar os arquivos enviados:", error.message);
  return (data ?? []).map((row) => row.file_url as string);
}

// Gera um link assinado para o navegador do admin enviar o arquivo direto ao Supabase
// (sem passar pelo servidor, que tem limite de tamanho por requisição).
export async function createLessonFileUpload(fileName: string) {
  const { adminSupabase } = await requireAdmin();
  const dot = fileName.lastIndexOf(".");
  const extension = dot > 0 ? fileName.slice(dot + 1).toLowerCase().replace(/[^a-z0-9]/g, "") : "";
  const baseName = slugify(dot > 0 ? fileName.slice(0, dot) : fileName) || "arquivo";
  const path = `${randomBytes(8).toString("hex")}/${baseName}${extension ? `.${extension}` : ""}`;
  const { data, error } = await adminSupabase.storage.from(LESSON_FILES_BUCKET).createSignedUploadUrl(path);
  if (error || !data) throw new Error(`Não foi possível preparar o envio do arquivo: ${error?.message ?? "erro desconhecido"}`);
  return { path: data.path, token: data.token };
}

// Salva a ordem de uma categoria do Início (lista de ids já na ordem desejada).
export async function reorderProducts(productIds: string[]) {
  const { adminSupabase } = await requireAdmin();
  const ids = [...new Set(productIds.map((id) => String(id).trim()).filter(Boolean))];
  const results = await Promise.all(ids.map((id, index) => adminSupabase.from("products").update({ position: index + 1 }).eq("id", id)));
  const failed = results.find((result) => result.error);
  if (failed?.error) throw new Error(`Não foi possível salvar a ordem: ${failed.error.message}`);
  await notify("Ordem salva.");
  revalidatePath("/dashboard");
  revalidatePath("/admin/products");
}

export async function deleteProduct(formData: FormData) {
  const { adminSupabase } = await requireAdmin();
  const productId = value(formData, "product_id");
  if (!productId) throw new Error("Produto inválido.");
  const storedFiles = await storedFileUrls(adminSupabase, { productId });
  const { error } = await adminSupabase.from("products").delete().eq("id", productId);
  if (error) throw new Error(`Não foi possível excluir o produto: ${error.message}`);
  await removeStoredFiles(adminSupabase, storedFiles);
  await notify("Produto excluído.");
  revalidatePath("/admin/products");
  redirect("/admin/products");
}

export async function deleteModule(formData: FormData) {
  const { adminSupabase } = await requireAdmin();
  const productId = value(formData, "product_id");
  const moduleId = value(formData, "module_id");
  if (!moduleId || !productId) throw new Error("Módulo e produto são obrigatórios.");
  const storedFiles = await storedFileUrls(adminSupabase, { moduleId });
  const { error } = await adminSupabase.from("modules").delete().eq("id", moduleId).eq("product_id", productId);
  if (error) throw new Error(`Não foi possível excluir o módulo: ${error.message}`);
  await removeStoredFiles(adminSupabase, storedFiles);
  await notify("Módulo excluído.");
  revalidatePath(`/admin/products/${productId}`);
}

export async function deleteLesson(formData: FormData) {
  const { adminSupabase } = await requireAdmin();
  const productId = value(formData, "product_id");
  const lessonId = value(formData, "lesson_id");
  if (!lessonId || !productId) throw new Error("Aula e produto são obrigatórios.");
  const storedFiles = await storedFileUrls(adminSupabase, { lessonId });
  const { error } = await adminSupabase.from("lessons").delete().eq("id", lessonId);
  if (error) throw new Error(`Não foi possível excluir a aula: ${error.message}`);
  await removeStoredFiles(adminSupabase, storedFiles);
  await notify("Aula excluída.");
  revalidatePath(`/admin/products/${productId}`);
  redirect(`/admin/products/${productId}`);
}

export async function createModule(formData: FormData) {
  const { adminSupabase } = await requireAdmin();
  const productId = value(formData, "product_id");
  const title = value(formData, "title");
  if (!productId || !title) throw new Error("Produto e título do módulo são obrigatórios.");
  const { error } = await adminSupabase.from("modules").insert({ product_id: productId, title, position: numberValue(formData, "position") });
  if (error) throw new Error(`Não foi possível criar o módulo: ${error.message}`);
  await notify("Módulo criado.");
  revalidatePath(`/admin/products/${productId}`);
}

export async function updateModule(formData: FormData) {
  const { adminSupabase } = await requireAdmin();
  const productId = value(formData, "product_id");
  const moduleId = value(formData, "module_id");
  const title = value(formData, "title");
  if (!productId || !moduleId || !title) throw new Error("Módulo e título são obrigatórios.");
  const { error } = await adminSupabase.from("modules").update({ title, position: numberValue(formData, "position") }).eq("id", moduleId).eq("product_id", productId);
  if (error) throw new Error(`Não foi possível salvar o módulo: ${error.message}`);
  await notify("Módulo salvo.");
  revalidatePath(`/admin/products/${productId}`);
}

// Cria ou edita uma aula junto com seus arquivos (a lista de arquivos do formulário substitui a anterior).
export async function saveLesson(formData: FormData) {
  const { adminSupabase } = await requireAdmin();
  const productId = value(formData, "product_id");
  const lessonId = value(formData, "lesson_id");
  const moduleId = value(formData, "module_id");
  const title = value(formData, "title");
  if (!productId || !moduleId || !title) throw new Error("Módulo e título da aula são obrigatórios.");

  const { data: moduleRow, error: moduleError } = await adminSupabase.from("modules").select("id").eq("id", moduleId).eq("product_id", productId).maybeSingle();
  if (moduleError || !moduleRow) throw new Error("O módulo escolhido não pertence a este produto.");

  const fileNames = formData.getAll("file_name").map((item) => String(item).trim());
  const fileUrls = formData.getAll("file_url").map((item) => String(item).trim());
  if (fileNames.length !== fileUrls.length || fileNames.some((name, index) => !name || !fileUrls[index])) throw new Error("Cada arquivo precisa de nome e de um link ou arquivo enviado (aguarde o envio terminar antes de salvar).");
  if (fileUrls.some((url) => !/^https?:\/\//i.test(url) && !/^storage:[a-f0-9]+\/[^/]+$/.test(url))) throw new Error("Link de arquivo inválido.");

  const lessonData = {
    module_id: moduleId,
    title,
    position: numberValue(formData, "position"),
    description: sanitizeRichText(value(formData, "description")),
    video_url: value(formData, "video_url") || null,
  };

  let savedLessonId = lessonId;
  if (lessonId) {
    const { error } = await adminSupabase.from("lessons").update(lessonData).eq("id", lessonId);
    if (error) throw new Error(`Não foi possível salvar a aula: ${error.message}`);
  } else {
    const { data: created, error } = await adminSupabase.from("lessons").insert(lessonData).select("id").single();
    if (error || !created) throw new Error(`Não foi possível criar a aula: ${error?.message ?? "aula não retornada"}`);
    savedLessonId = created.id;
  }

  const previousFiles = lessonId ? await storedFileUrls(adminSupabase, { lessonId }) : [];
  const { error: deleteFilesError } = await adminSupabase.from("lesson_files").delete().eq("lesson_id", savedLessonId);
  if (deleteFilesError) throw new Error(`Não foi possível salvar os arquivos: ${deleteFilesError.message}`);
  if (fileNames.length > 0) {
    const { error: insertFilesError } = await adminSupabase.from("lesson_files").insert(fileNames.map((fileName, index) => ({ lesson_id: savedLessonId, file_name: fileName, file_url: fileUrls[index], position: index })));
    if (insertFilesError) throw new Error(`Não foi possível salvar os arquivos: ${insertFilesError.message}`);
  }
  // Arquivos removidos ou trocados nesta edição saem também do bucket.
  await removeStoredFiles(adminSupabase, previousFiles.filter((url) => !fileUrls.includes(url)));

  await notify(lessonId ? "Aula salva." : "Aula criada.");
  revalidatePath(`/admin/products/${productId}`);
  if (value(formData, "intent") === "save_and_new") redirect(`/admin/products/${productId}/lessons/new?module=${moduleId}`);
  redirect(`/admin/products/${productId}`);
}

export async function updateMemberFlags(formData: FormData) {
  const { adminSupabase } = await requireAdmin();
  const userId = value(formData, "user_id");
  const field = value(formData, "field");
  if (!userId || !["blocked", "unlimited_access"].includes(field)) throw new Error("Dados do membro inválidos.");
    const { error } = await adminSupabase.from("profiles").upsert({ id: userId, [field]: value(formData, "enabled") === "true" }, { onConflict: "id" });
  if (error) throw new Error(`Não foi possível atualizar o membro: ${error.message}`);
  await notify("Alteração salva.");
  revalidatePath(`/admin/members/${userId}`);
  revalidatePath("/admin/members");
}

export async function updateMemberAccess(formData: FormData) {
  const { adminSupabase } = await requireAdmin();
  const userId = value(formData, "user_id");
  const productId = value(formData, "product_id");
  const status = value(formData, "status");
  if (!userId || !productId || !["none", "active", "disabled"].includes(status)) throw new Error("Dados de acesso inválidos.");

  const { data: existing, error: lookupError } = await adminSupabase.from("user_access").select("user_id").eq("user_id", userId).eq("product_id", productId).maybeSingle();
  if (lookupError) throw new Error(`Não foi possível consultar o acesso: ${lookupError.message}`);
  if (status === "none") {
    if (existing) {
      const { error } = await adminSupabase.from("user_access").delete().eq("user_id", userId).eq("product_id", productId);
      if (error) throw new Error(`Não foi possível remover o acesso: ${error.message}`);
    }
  } else if (existing) {
    const { error } = await adminSupabase.from("user_access").update({ status }).eq("user_id", userId).eq("product_id", productId);
    if (error) throw new Error(`Não foi possível atualizar o acesso: ${error.message}`);
  } else {
    const { error } = await adminSupabase.from("user_access").insert({ user_id: userId, product_id: productId, status });
    if (error) throw new Error(`Não foi possível criar o acesso: ${error.message}`);
  }
  await notify("Acesso atualizado.");
  revalidatePath(`/admin/members/${userId}`);
  revalidatePath("/dashboard");
}

export async function resendMemberPassword(formData: FormData) {
  const { adminSupabase } = await requireAdmin();
  const userId = value(formData, "user_id");
  if (!userId) throw new Error("Membro inválido.");
  const { data: userResult, error: userError } = await adminSupabase.auth.admin.getUserById(userId);
  if (userError || !userResult.user?.email) throw new Error("Não foi possível localizar o e-mail do membro.");

  const password = randomBytes(24).toString("base64url");
  const { error: updateError } = await adminSupabase.auth.admin.updateUserById(userId, { password });
  if (updateError) throw new Error(`Não foi possível gerar a nova senha: ${updateError.message}`);
  const name = typeof userResult.user.user_metadata?.name === "string" ? userResult.user.user_metadata.name : userResult.user.email.split("@")[0];
  await sendWelcomeEmail({ email: userResult.user.email, name, password });
  await notify("Nova senha enviada por e-mail.");
  revalidatePath(`/admin/members/${userId}`);
}

export async function createMember(formData: FormData) {
  const { adminSupabase } = await requireAdmin();
  const name = value(formData, "name");
  const email = value(formData, "email").toLowerCase();
  const typedPassword = String(formData.get("password") ?? "");
  const productIds = formData.getAll("product_ids").map(String).filter(Boolean);
  const unlimitedAccess = formData.get("unlimited_access") === "on";
  const sendEmail = formData.get("send_email") === "on";
  const fail = (message: string) => redirect(`/admin/members/new?error=${encodeURIComponent(message)}`);

  if (!email || !email.includes("@")) fail("Informe um e-mail válido.");
  if (typedPassword && typedPassword.length < 6) fail("A senha deve ter pelo menos 6 caracteres.");
  const password = typedPassword || randomBytes(6).toString("base64url");

  const { data: created, error: createError } = await adminSupabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { name: name || email.split("@")[0] },
  });
  if (createError || !created.user) {
    const alreadyExists = createError?.message.toLowerCase().includes("already") || createError?.status === 422;
    return fail(alreadyExists ? "Já existe um membro com este e-mail." : `Não foi possível criar o membro: ${createError?.message ?? "erro desconhecido"}`);
  }
  const userId = created.user.id;

  const { error: profileError } = await adminSupabase.from("profiles").upsert({ id: userId, is_admin: false, blocked: false, unlimited_access: unlimitedAccess }, { onConflict: "id" });
  if (profileError) fail(`Membro criado, mas não foi possível salvar o perfil: ${profileError.message}`);

  if (productIds.length > 0) {
    const { error: accessError } = await adminSupabase.from("user_access").insert(productIds.map((productId) => ({ user_id: userId, product_id: productId, status: "active" as const })));
    if (accessError) fail(`Membro criado, mas não foi possível liberar os produtos: ${accessError.message}`);
  }

  let emailError = "";
  if (sendEmail) {
    try {
      await sendWelcomeEmail({ email, name: name || email.split("@")[0], password });
    } catch (error) {
      emailError = error instanceof Error ? error.message : "erro desconhecido";
    }
  }

  revalidatePath("/admin/members");
  if (emailError) fail(`Membro criado, mas o e-mail não foi enviado (${emailError}). Use "Reenviar senha" na página do membro.`);
  redirect(`/admin/members/${userId}?created=1`);
}

export async function updateMemberEmail(formData: FormData) {
  const { adminSupabase } = await requireAdmin();
  const userId = value(formData, "user_id");
  const email = value(formData, "email");
  if (!userId || !email || !email.includes("@")) throw new Error("Informe um e-mail válido.");

  const { error } = await adminSupabase.auth.admin.updateUserById(userId, { email });
  if (error) throw new Error(`Não foi possível atualizar o e-mail: ${error.message}`);
  await notify("E-mail atualizado.");
  revalidatePath(`/admin/members/${userId}`);
  revalidatePath("/admin/members");
}

export async function updateMemberPassword(formData: FormData) {
  const { adminSupabase } = await requireAdmin();
  const userId = value(formData, "user_id");
  const password = String(formData.get("password") ?? "");
  if (!userId || password.length < 6) throw new Error("A senha deve ter pelo menos 6 caracteres.");

  const { error } = await adminSupabase.auth.admin.updateUserById(userId, { password });
  if (error) throw new Error(`Não foi possível definir a senha: ${error.message}`);
  await notify("Senha definida.");
  revalidatePath(`/admin/members/${userId}`);
}

export async function updateOwnBio(formData: FormData) {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  const profileId = value(formData, "profile_id");
  const bio = String(formData.get("bio") ?? "").trim();
  if (!user || !profileId || user.id !== profileId) throw new Error("Você só pode atualizar o próprio perfil.");
  if (bio.length > 500) throw new Error("A bio deve ter no máximo 500 caracteres.");

  // Grava pelo servidor e só a coluna bio: o aluno não tem permissão de escrita no próprio perfil.
  const { error } = await createAdminClient().from("profiles").update({ bio: bio || null }).eq("id", user.id);
  if (error) throw new Error(`Não foi possível salvar a bio: ${error.message}`);
}

export async function updateTermsSettings(formData: FormData) {
  const { adminSupabase } = await requireAdmin();
  const termsHtml = sanitizeRichText(value(formData, "terms_html"));
  if (!termsHtml) throw new Error("O texto dos termos não pode ficar vazio.");

  const { error } = await adminSupabase.from("app_settings").upsert({ key: TERMS_SETTING_KEY, value: termsHtml, updated_at: new Date().toISOString() });
  if (error) throw new Error(`Não foi possível salvar os termos: ${error.message}`);

  const requireReaccept = formData.get("require_reaccept") === "on";
  if (requireReaccept) {
    const { error: resetError } = await adminSupabase.from("profiles").update({ terms_accepted_at: null }).not("terms_accepted_at", "is", null);
    if (resetError) throw new Error(`Termos salvos, mas não foi possível pedir um novo aceite: ${resetError.message}`);
  }
  await notify(requireReaccept ? "Termos salvos. Todos vão aceitar de novo." : "Termos salvos.");
  revalidatePath("/", "layout");
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function updateBrandSettings(formData: FormData) {
  const { adminSupabase } = await requireAdmin();
  const name = value(formData, "brand_name");
  const supportEmail = value(formData, "support_email").toLowerCase();
  const alertEmail = value(formData, "alert_email").toLowerCase();
  if (!name) throw new Error("O nome da área de membros é obrigatório.");
  if (!EMAIL_PATTERN.test(supportEmail)) throw new Error("Informe um e-mail de suporte válido.");
  if (!EMAIL_PATTERN.test(alertEmail)) throw new Error("Informe um e-mail válido para os avisos de compra.");

  const updatedAt = new Date().toISOString();
  const rows: { key: string; value: string; updated_at: string }[] = [
    { key: BRAND_SETTING_KEYS.name, value: name, updated_at: updatedAt },
    { key: BRAND_SETTING_KEYS.supportEmail, value: supportEmail, updated_at: updatedAt },
    { key: BRAND_SETTING_KEYS.alertEmail, value: alertEmail, updated_at: updatedAt },
  ];

  const logo = formData.get("logo");
  if (logo instanceof File && logo.size > 0) {
    if (!["image/png", "image/jpeg", "image/webp"].includes(logo.type)) throw new Error("A logo precisa ser PNG, JPG ou WEBP.");
    // O envio pelo formulário tem limite de 1 MB no total, então a logo fica um pouco abaixo disso.
    if (logo.size > 900 * 1024) throw new Error("A logo deve ter no máximo 900 KB.");
    const extension = logo.name.split(".").pop()?.toLowerCase() || "png";
    // Nome novo a cada envio, para navegadores e e-mails não mostrarem a logo antiga guardada em cache.
    const path = `logo-${Date.now()}-${randomBytes(4).toString("hex")}.${extension}`;
    const { error: uploadError } = await adminSupabase.storage.from("branding").upload(path, logo, { contentType: logo.type, upsert: false });
    if (uploadError) throw new Error(`Não foi possível enviar a logo: ${uploadError.message}`);
    rows.push({ key: BRAND_SETTING_KEYS.logoUrl, value: adminSupabase.storage.from("branding").getPublicUrl(path).data.publicUrl, updated_at: updatedAt });
  }

  const { error } = await adminSupabase.from("app_settings").upsert(rows);
  if (error) throw new Error(`Não foi possível salvar a identidade: ${error.message}`);

  revalidateTag(BRAND_CACHE_TAG, { expire: 0 });
  revalidatePath("/", "layout");
  await notify("Identidade salva.");
}

export async function createCategory(formData: FormData) {
  const { adminSupabase } = await requireAdmin();
  const name = value(formData, "name");
  if (!name) throw new Error("O nome da categoria é obrigatório.");
  const { error } = await adminSupabase.from("categories").insert({ name, position: numberValue(formData, "position") });
  if (error) throw new Error(`Não foi possível criar a categoria: ${error.message}`);
  await notify("Categoria criada.");
  revalidatePath("/admin/categories");
  revalidatePath("/admin/products/new");
  redirect("/admin/categories");
}

export async function updateCategory(formData: FormData) {
  const { adminSupabase } = await requireAdmin();
  const id = value(formData, "id");
  const name = value(formData, "name");
  if (!id || !name) throw new Error("Nome e categoria são obrigatórios.");
  const { error } = await adminSupabase.from("categories").update({ name, position: numberValue(formData, "position") }).eq("id", id);
  if (error) throw new Error(`Não foi possível atualizar a categoria: ${error.message}`);
  await notify("Categoria salva.");
  revalidatePath("/admin/categories");
  revalidatePath("/dashboard");
}

export async function deleteCategory(formData: FormData) {
  const { adminSupabase } = await requireAdmin();
  const id = value(formData, "id");
  if (!id) throw new Error("Categoria inválida.");
  const { error } = await adminSupabase.from("categories").delete().eq("id", id);
  if (error) throw new Error(`Não foi possível excluir a categoria: ${error.message}`);
  await notify("Categoria excluída.");
  revalidatePath("/admin/categories");
  revalidatePath("/dashboard");
  redirect("/admin/categories");
}