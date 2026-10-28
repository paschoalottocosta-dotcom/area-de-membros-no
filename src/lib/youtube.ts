export function normalizeYouTubeToEmbed(rawUrl: string | null) {
  if (!rawUrl) return "";

  try {
    const url = new URL(rawUrl);
    const host = url.hostname.replace(/^www\./, "");
    const path = url.pathname;

    if (host === "youtu.be") {
      const id = path.replace("/", "").split("/")[0];
      return id ? `https://www.youtube.com/embed/${id}` : rawUrl;
    }

    if (host === "youtube.com" || host === "m.youtube.com") {
      const videoId = url.searchParams.get("v");
      if (videoId) return `https://www.youtube.com/embed/${videoId}`;
      if (path.startsWith("/embed/")) return rawUrl;
      if (path.startsWith("/shorts/")) {
        const id = path.split("/").filter(Boolean)[1];
        return id ? `https://www.youtube.com/embed/${id}` : rawUrl;
      }
    }

    return rawUrl;
  } catch {
    return rawUrl;
  }
}
