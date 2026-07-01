"use client";

import { extractYouTubeId } from "@/lib/youtube";

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
