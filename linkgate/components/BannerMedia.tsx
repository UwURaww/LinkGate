"use client";

function extractYouTubeId(url: string): string | null {
  const patterns = [
    /youtu\.be\/([a-zA-Z0-9_-]{6,})/,
    /youtube\.com\/watch\?v=([a-zA-Z0-9_-]{6,})/,
    /youtube\.com\/embed\/([a-zA-Z0-9_-]{6,})/,
    /youtube\.com\/shorts\/([a-zA-Z0-9_-]{6,})/,
  ];
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  return null;
}

export default function BannerMedia({
  url,
  type,
}: {
  url?: string;
  type?: "image" | "video" | "youtube";
}) {
  if (!url) return null;

  if (type === "youtube") {
    const id = extractYouTubeId(url);
    if (!id) return null;
    return (
      <div className="gate-banner gate-banner-media">
        <iframe
          src={`https://www.youtube.com/embed/${id}?autoplay=1&mute=1&loop=1&playlist=${id}&controls=0&modestbranding=1`}
          allow="autoplay; encrypted-media"
          loading="lazy"
          title="Banner"
        />
      </div>
    );
  }

  if (type === "video") {
    return (
      <div className="gate-banner gate-banner-media">
        <video src={url} autoPlay muted loop playsInline />
      </div>
    );
  }

  return (
    <div className="gate-banner">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={url} alt="" />
    </div>
  );
}
