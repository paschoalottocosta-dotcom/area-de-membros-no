"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight, BookOpen, Lock, LockKeyhole } from "lucide-react";
import { useMemo, useState } from "react";

interface ProductCardProps {
  product: { id: string; name: string; slug?: string | null; is_visible?: boolean | null; sales_url?: string | null; cover_image_url?: string | null; };
  hasAccess: boolean;
  salesUrl?: string | null;
}

export function ProductCard({ product, hasAccess, salesUrl }: ProductCardProps) {
  const [showSalesNotice, setShowSalesNotice] = useState(false);
  const card = (
    <article className={`product-card ${hasAccess ? "" : "product-card--locked"}`}>
      {product.cover_image_url ? <Image src={product.cover_image_url} alt={product.name} fill sizes="(max-width: 560px) 165px, (max-width: 900px) 194px, 300px" className="product-card__cover" /> : null}
      {product.cover_image_url && !hasAccess ? <div className="product-card__cover-overlay"><Lock size={30} strokeWidth={1.75} /></div> : null}
      <div className="product-card__content">
        <div className="product-card__top">
          {!product.cover_image_url && <span className="product-card__icon"><BookOpen size={18} /></span>}
          {!product.cover_image_url && (hasAccess ? <ArrowUpRight className="product-card__arrow" size={20} /> : <LockKeyhole className="product-card__lock" size={19} />)}
        </div>
        {!product.cover_image_url && <div className="product-card__body"><p className="product-card__meta">{hasAccess ? "Disponível agora" : "Conteúdo bloqueado"}</p><h2 className="product-card__title">{product.name}</h2>{product.is_visible === false && hasAccess && <span className="product-card__badge">Oculto na vitrine</span>}</div>}
      </div>
      {showSalesNotice && !hasAccess && !salesUrl && (
        <span className="product-card__notice">Sem página de vendas cadastrada.</span>
      )}
    </article>
  );

  if (hasAccess) {
    return <Link href={`/products/${product.slug ?? product.id}`}>{card}</Link>;
  }

  if (!hasAccess && salesUrl) {
    return (
      <a href={salesUrl} target="_blank" rel="noreferrer" className="product-card__link" onClick={(event) => {
        if (!salesUrl.trim()) {
          event.preventDefault();
          setShowSalesNotice(true);
        }
      }}>
        {card}
      </a>
    );
  }

  return <div className="product-card__link">{card}</div>;
}
