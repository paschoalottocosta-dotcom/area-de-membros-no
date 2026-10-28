"use client";

import { ArrowDownUp, ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { useRef, useState, type DragEvent } from "react";

import { reorderProducts } from "@/app/admin/actions";
import { ProductCard } from "@/components/ProductCards";

interface Product { id: string; name: string; slug?: string | null; is_visible?: boolean | null; sales_url?: string | null; cover_image_url?: string | null; }

export function CategoryProductRow({ title, products, access, canReorder = false }: { title: string; products: Product[]; access: Set<string>; canReorder?: boolean }) {
  const rowRef = useRef<HTMLDivElement>(null);
  const [sorting, setSorting] = useState(false);
  const [order, setOrder] = useState(products);
  const [dragId, setDragId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  // Avança ~80% da largura visível, já que o tamanho dos cards acompanha a tela.
  const scroll = (direction: number) => rowRef.current?.scrollBy({ left: direction * rowRef.current.clientWidth * 0.8, behavior: "smooth" });

  function moveTo(id: string, targetIndex: number) {
    setOrder((current) => {
      const from = current.findIndex((product) => product.id === id);
      if (from < 0 || targetIndex < 0 || targetIndex >= current.length || from === targetIndex) return current;
      const copy = [...current];
      const [item] = copy.splice(from, 1);
      copy.splice(targetIndex, 0, item);
      return copy;
    });
  }

  function handleDragOver(event: DragEvent<HTMLDivElement>, index: number) {
    event.preventDefault();
    if (dragId) moveTo(dragId, index);
  }

  function startSorting() {
    setOrder(products);
    setError("");
    setSorting(true);
  }

  async function save() {
    setSaving(true);
    setError("");
    try {
      await reorderProducts(order.map((product) => product.id));
      setSorting(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível salvar a ordem.");
    } finally {
      setSaving(false);
    }
  }

  const list = sorting ? order : products;

  return (
    <div className={`category-product-row ${sorting ? "category-product-row--sorting" : ""}`}>
      <div className="dashboard-category__heading">
        <h2>{title}</h2>
        <div className="category-scroll-controls">
          {canReorder && !sorting && <button type="button" className="category-sort-button" onClick={startSorting}><ArrowDownUp size={13} /> Organizar</button>}
          {sorting && (
            <>
              <span className="category-sort-hint">Arraste os cards para mudar a ordem</span>
              <button type="button" className="btn btn--outline category-sort-action" disabled={saving} onClick={() => setSorting(false)}>Cancelar</button>
              <button type="button" className="btn category-sort-action" disabled={saving} onClick={save}>{saving ? <><Loader2 size={13} className="animate-spin" /> Salvando...</> : "Salvar ordem"}</button>
            </>
          )}
          <button type="button" className="category-scroll-button" onClick={() => scroll(-1)} aria-label="Ver produtos anteriores"><ChevronLeft size={14} /></button>
          <button type="button" className="category-scroll-button" onClick={() => scroll(1)} aria-label="Ver próximos produtos"><ChevronRight size={14} /></button>
        </div>
      </div>
      {error && <p className="form-status text-destructive" style={{ marginBottom: 10 }}>{error}</p>}
      <div ref={rowRef} className="category-product-scroll">
        {list.map((product, index) => sorting ? (
          // No modo Organizar o card vira só "arrastável": os links ficam desativados.
          <div
            key={product.id}
            draggable
            onDragStart={(event) => { setDragId(product.id); event.dataTransfer.effectAllowed = "move"; }}
            onDragOver={(event) => handleDragOver(event, index)}
            onDragEnd={() => setDragId(null)}
            className={`category-sort-item ${dragId === product.id ? "category-sort-item--dragging" : ""}`}
          >
            <ProductCard product={product} hasAccess={access.has(product.id)} salesUrl={product.sales_url ?? undefined} />
            <div className="category-sort-item__arrows">
              <button type="button" aria-label="Mover para a esquerda" disabled={index === 0} onClick={() => moveTo(product.id, index - 1)}><ChevronLeft size={15} /></button>
              <span>{index + 1}</span>
              <button type="button" aria-label="Mover para a direita" disabled={index === list.length - 1} onClick={() => moveTo(product.id, index + 1)}><ChevronRight size={15} /></button>
            </div>
          </div>
        ) : <ProductCard key={product.id} product={product} hasAccess={access.has(product.id)} salesUrl={product.sales_url ?? undefined} />)}
      </div>
    </div>
  );
}
