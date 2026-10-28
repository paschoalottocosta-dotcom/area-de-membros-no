"use client";

import { Check, Copy } from "lucide-react";
import { useState } from "react";

export function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  }

  return (
    <button type="button" className="btn btn--outline" onClick={copy}>
      {copied ? <><Check size={14} /> Copiado</> : <><Copy size={14} /> Copiar</>}
    </button>
  );
}
