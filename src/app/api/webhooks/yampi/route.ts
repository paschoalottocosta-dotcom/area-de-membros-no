import { createHmac, timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";

import { sendAdminAlert } from "@/lib/admin-alert";
import { grantAccess } from "@/lib/grant-access";
import { createAdminClient } from "@/lib/supabase/admin";
import { logWebhook } from "@/lib/webhook-log";

interface YampiItem {
  sku_id: string | number;
  bundle_id?: string | number | null;
  bundle_name?: string | null;
}

interface YampiPayload {
  event: string;
  resource: {
    customer: { data: { email: string; name: string } };
    items: { data: YampiItem[] };
  };
}

interface ProductRow {
  id: string;
  yampi_product_id: string;
}

interface ComboRow {
  id: string;
  yampi_product_id: string;
  combo_items: { product_id: string }[];
}

function okResponse() {
  return NextResponse.json({ ok: true }, { status: 200 });
}

function unauthorizedResponse() {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

export async function POST(request: Request) {
  let customerEmail: string | null = null;
  try {
    const rawBody = await request.text();
    const secret = process.env.YAMPI_WEBHOOK_SECRET ?? "";
    const providedSignature = request.headers.get("X-Yampi-Hmac-SHA256") ?? "";

    const expectedSignature = createHmac("sha256", secret)
      .update(rawBody)
      .digest("base64");

    const expectedBuffer = Buffer.from(expectedSignature, "utf8");
    const providedBuffer = Buffer.from(providedSignature, "utf8");

    if (
      !secret ||
      !providedSignature ||
      expectedBuffer.length !== providedBuffer.length ||
      !timingSafeEqual(expectedBuffer, providedBuffer)
    ) {
      await logWebhook("recusado", secret
        ? "Assinatura inválida: o segredo configurado na Yampi não confere com o YAMPI_WEBHOOK_SECRET da Vercel."
        : "YAMPI_WEBHOOK_SECRET não está configurado na Vercel, então nenhuma compra é aceita.");
      return unauthorizedResponse();
    }

    const payload: unknown = JSON.parse(rawBody);

    if (!payload || typeof payload !== "object" || (payload as { event?: unknown }).event !== "order.paid") {
      await logWebhook("ignorado", `Evento "${String((payload as { event?: unknown } | null)?.event ?? "desconhecido")}" ignorado (só "order.paid" libera acesso).`);
      return okResponse();
    }

    const orderPaidPayload = payload as Partial<YampiPayload>;
    const email = orderPaidPayload.resource?.customer?.data?.email;
    const name = orderPaidPayload.resource?.customer?.data?.name;
    const items = orderPaidPayload.resource?.items?.data;
    if (typeof email === "string") customerEmail = email;

    if (
      typeof email !== "string" ||
      typeof name !== "string" ||
      !Array.isArray(items) ||
      items.length === 0 ||
      items.some((item) => !item || typeof item !== "object" || !["string", "number"].includes(typeof item.sku_id))
    ) {
      // Reenviar não muda os dados do pedido, então responde OK e só avisa o dono para liberar manualmente.
      await sendAdminAlert("Compra com dados incompletos", `A Yampi enviou uma compra paga sem e-mail, nome ou itens válidos. Libere o acesso manualmente pelo admin.\n\nE-mail: ${String(email ?? "(vazio)")}`);
      await logWebhook("alerta", "Compra paga sem e-mail, nome ou itens válidos. Libere o acesso manualmente.", customerEmail);
      return okResponse();
    }

    const skuIds = [...new Set(items.map((item) => String(item.sku_id).trim()).filter(Boolean))];
    if (skuIds.length === 0) {
      await sendAdminAlert("Compra sem SKU", `A compra paga de ${email} chegou sem nenhum sku_id. Libere o acesso manualmente pelo admin.`);
      await logWebhook("alerta", "Compra sem nenhum SKU. Libere o acesso manualmente.", email);
      return okResponse();
    }

    const adminSupabase = createAdminClient();
    const { data: matchedProducts, error: productsError } = await adminSupabase
      .from("products")
      .select("id, yampi_product_id")
      .in("yampi_product_id", skuIds);

    if (productsError) {
      throw new Error(`Não foi possível buscar produtos pelo ID da Yampi: ${productsError.message}`);
    }

    // Combos: um único produto na Yampi que libera os produtos marcados na aba Combos do admin.
    const { data: matchedCombos, error: combosError } = await adminSupabase
      .from("combos")
      .select("id, yampi_product_id, combo_items(product_id)")
      .in("yampi_product_id", skuIds);

    if (combosError) {
      throw new Error(`Não foi possível buscar combos pelo ID da Yampi: ${combosError.message}`);
    }

    const productsBySku = new Map(((matchedProducts ?? []) as ProductRow[]).map((product) => [product.yampi_product_id, product]));
    const combosBySku = new Map(((matchedCombos ?? []) as ComboRow[]).map((combo) => [combo.yampi_product_id, combo]));

    const productIds = new Set<string>();
    const unmatchedSkus: string[] = [];

    // Cada item da venda (ex: produto principal + Order Bump) é resolvido separadamente e os resultados são somados.
    for (const item of items) {
      const skuId = String(item.sku_id).trim();
      const product = productsBySku.get(skuId);
      const combo = product ? undefined : combosBySku.get(skuId);
      console.log("Item do pedido Yampi:", JSON.stringify({
        sku_id: skuId,
        bundle_id: item.bundle_id ?? null,
        bundle_name: item.bundle_name ?? null,
        matched: product ? "produto" : combo ? "combo" : false,
      }));

      if (combo) {
        combo.combo_items.forEach((comboItem) => productIds.add(comboItem.product_id));
      } else if (product) {
        productIds.add(product.id);
      } else {
        unmatchedSkus.push(skuId);
      }
    }

    // Normalmente é um produto sem o SKU ID preenchido no admin (ou um combo sem produtos marcados).
    if (unmatchedSkus.length > 0 || productIds.size === 0) {
      await sendAdminAlert(
        "Produto da compra não encontrado na área",
        `Compra paga de ${email} com SKU(s) que não estão cadastrados em nenhum produto ou combo: ${unmatchedSkus.join(", ") || "(combo sem produtos)"}.\n\n` +
          (productIds.size > 0
            ? "Os demais produtos da compra foram liberados normalmente. Cadastre o SKU no produto certo e libere o que faltou pelo admin (Membros)."
            : "Nenhum acesso foi liberado e nenhuma conta foi criada. Cadastre o SKU no produto certo e crie o membro pelo admin (Membros > Novo membro)."),
      );
    }

    const result = await grantAccess({ email, name, productIds: [...productIds] });
    const granted = `${result.grantedProducts.length} produto(s) liberado(s)${result.createdUser ? ", conta criada e e-mail com a senha enviado" : " para aluno que já tinha conta"}.`;
    if (productIds.size === 0) {
      await logWebhook("alerta", `Nenhum acesso liberado: SKU(s) não cadastrados em produto ou combo: ${unmatchedSkus.join(", ") || "(combo sem produtos)"}.`, email);
    } else if (unmatchedSkus.length > 0) {
      await logWebhook("alerta", `${granted} SKU(s) não cadastrados: ${unmatchedSkus.join(", ")}.`, email);
    } else {
      await logWebhook("liberado", granted, email);
    }
  } catch (error) {
    // Responde com erro para a Yampi reenviar a compra mais tarde (ex.: Supabase pausado ou e-mail fora do ar).
    const message = error instanceof Error ? error.message : String(error);
    await sendAdminAlert("Erro ao liberar uma compra", `A Yampi vai tentar de novo automaticamente. Se este aviso se repetir, verifique o Supabase/Resend e libere o acesso manualmente.\n\nErro: ${message}`);
    await logWebhook("erro", `${message} (a Yampi vai tentar de novo automaticamente)`, customerEmail);
    return NextResponse.json({ error: "Erro ao processar a compra" }, { status: 500 });
  }

  return okResponse();
}

export async function GET() {
  return NextResponse.json({ error: "Method not allowed" }, { status: 405 });
}
