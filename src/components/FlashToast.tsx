"use client";

import { CircleCheck } from "lucide-react";
import { useEffect, useState } from "react";

// Mostra no rodapé a mensagem gravada pelas Server Actions no cookie "flash" ("<id>|<mensagem>").
export function FlashToast({ flash }: { flash?: string }) {
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!flash) return;
    document.cookie = "flash=; Max-Age=0; path=/";
    setMessage(flash.slice(flash.indexOf("|") + 1));
    const timer = setTimeout(() => setMessage(""), 3000);
    return () => clearTimeout(timer);
  }, [flash]);

  if (!message) return null;
  return (
    <div className="flash-toast" role="status">
      <CircleCheck size={16} />
      {message}
    </div>
  );
}
