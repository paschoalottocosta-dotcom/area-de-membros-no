"use client";

import { Play } from "lucide-react";
import { useState } from "react";

// Mostra só a miniatura do vídeo; o player do YouTube (pesado, mais de 1 MB) só carrega
// quando o aluno clica em play. Links que não são do YouTube viram o iframe direto.
export function YoutubeEmbed({ embedUrl, title }: { embedUrl: string; title: string }) {
  const [playing, setPlaying] = useState(false);
  const videoId = embedUrl.match(/youtube\.com\/embed\/([\w-]{6,})/)?.[1];

  if (!videoId || playing) {
    const src = videoId ? `https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0` : embedUrl;
    return <div className="lesson-video"><iframe src={src} title={title} allow="autoplay; fullscreen; picture-in-picture" allowFullScreen /></div>;
  }

  return (
    <div className="lesson-video">
      <button type="button" className="lesson-video__poster" onClick={() => setPlaying(true)} aria-label={`Assistir: ${title}`}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={`https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`} alt="" />
        <span className="lesson-video__play"><Play size={24} fill="currentColor" /></span>
      </button>
    </div>
  );
}
