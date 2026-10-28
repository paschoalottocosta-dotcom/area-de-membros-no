// Envia um payload de teste, assinado, para o webhook da Yampi rodando localmente.
// Uso: node scripts/test-webhook.mjs caminho/do/payload.json
// Atenção: cria um usuário de verdade e envia e-mail de verdade. Use só o seu próprio e-mail no JSON.
import { createHmac } from "node:crypto";
import { readFileSync } from "node:fs";

const payloadPath = process.argv[2];
if (!payloadPath) {
  console.error("Uso: node scripts/test-webhook.mjs caminho/do/payload.json");
  process.exit(1);
}

function readEnvValue(name) {
  const envFile = readFileSync(new URL("../.env.local", import.meta.url), "utf8");
  for (const line of envFile.split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
    if (match && match[1] === name) return match[2].replace(/^(['"])(.*)\1$/, "$2");
  }
  return "";
}

const secret = readEnvValue("YAMPI_WEBHOOK_SECRET");
if (!secret) {
  console.error("YAMPI_WEBHOOK_SECRET não encontrado no .env.local.");
  process.exit(1);
}

// Assina e envia exatamente os bytes do arquivo: reformatar o JSON quebraria a assinatura.
const body = readFileSync(payloadPath);
const signature = createHmac("sha256", secret).update(body).digest("base64");

const response = await fetch("http://localhost:3000/api/webhooks/yampi", {
  method: "POST",
  headers: { "Content-Type": "application/json", "X-Yampi-Hmac-SHA256": signature },
  body,
});

console.log(`Resposta: ${response.status} ${await response.text()}`);
console.log("O webhook responde 200 mesmo quando dá erro; confira o resultado no terminal do npm run dev.");
