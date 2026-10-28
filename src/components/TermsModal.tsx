"use client";

import { PointerEvent, useEffect, useRef, useState } from "react";
import { Loader2 } from "lucide-react";

import { acceptTerms } from "@/app/profile/actions";
import { TermsContent } from "@/components/TermsContent";

const TRACK_INSET = 10;

// Pop-up obrigatório do primeiro acesso: só libera o botão depois de rolar o texto até o fim
// e não fecha por clique fora nem ESC.
export function TermsModal({ html }: { html: string }) {
  const [open, setOpen] = useState(true);
  const [readToEnd, setReadToEnd] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [thumb, setThumb] = useState<{ size: number; offset: number } | null>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ startY: number; startScroll: number } | null>(null);

  // A barra de rolagem é desenhada à mão porque navegadores de celular escondem a nativa.
  function updateScroll() {
    const body = bodyRef.current;
    if (!body) return;
    const { scrollTop, clientHeight, scrollHeight } = body;
    if (scrollTop + clientHeight >= scrollHeight - 8) setReadToEnd(true);
    if (scrollHeight <= clientHeight) return setThumb(null);
    const track = clientHeight - TRACK_INSET * 2;
    const size = Math.max(32, (track * clientHeight) / scrollHeight);
    setThumb({ size, offset: ((track - size) * scrollTop) / (scrollHeight - clientHeight) });
  }

  function handleThumbDown(event: PointerEvent<HTMLDivElement>) {
    event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current = { startY: event.clientY, startScroll: bodyRef.current?.scrollTop ?? 0 };
  }

  function handleThumbMove(event: PointerEvent<HTMLDivElement>) {
    const body = bodyRef.current;
    if (!dragRef.current || !body || !thumb) return;
    const track = body.clientHeight - TRACK_INSET * 2;
    const ratio = (body.scrollHeight - body.clientHeight) / (track - thumb.size);
    body.scrollTop = dragRef.current.startScroll + (event.clientY - dragRef.current.startY) * ratio;
  }

  useEffect(() => {
    if (!open) return;
    updateScroll();
    const observer = new ResizeObserver(() => updateScroll());
    if (bodyRef.current) observer.observe(bodyRef.current);
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      observer.disconnect();
      document.body.style.overflow = previous;
    };
  }, [open]);

  async function handleAccept() {
    setSaving(true);
    setError("");
    try {
      await acceptTerms();
      setOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível registrar o aceite. Tente novamente.");
      setSaving(false);
    }
  }

  if (!open) return null;
  return (
    <div className="terms-modal" role="dialog" aria-modal="true" aria-labelledby="terms-modal-title">
      <div className="terms-modal__card">
        <div className="terms-modal__head">
          <h2 id="terms-modal-title">Termos e condições de Uso</h2>
          <p>Leia com atenção até o final para continuar.</p>
        </div>
        <div className="terms-modal__scroll">
          <div ref={bodyRef} onScroll={updateScroll} className="terms-modal__body" tabIndex={0}>
            <TermsContent html={html} />
          </div>
          {thumb && (
            <div className="terms-modal__track" aria-hidden="true">
              <div
                className="terms-modal__thumb"
                style={{ height: thumb.size, transform: `translateY(${thumb.offset}px)` }}
                onPointerDown={handleThumbDown}
                onPointerMove={handleThumbMove}
                onPointerUp={() => { dragRef.current = null; }}
                onPointerCancel={() => { dragRef.current = null; }}
              />
            </div>
          )}
        </div>
        <div className="terms-modal__footer">
          {error && <p className="form-status">{error}</p>}
          <button type="button" onClick={handleAccept} disabled={!readToEnd || saving} className="btn terms-modal__button">
            {saving ? <><Loader2 size={14} className="animate-spin" /> Salvando...</> : readToEnd ? "Li e concordo" : "Role até o final para continuar"}
          </button>
        </div>
      </div>
    </div>
  );
}
