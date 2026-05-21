"use client";

import { useState } from "react";
import { getYouTubeVideoMeta } from "../../lib/youtube";

type ProductVideoProps = {
  productName: string;
  youtubeVideoUrl?: string | null;
};

export default function ProductVideo({ productName, youtubeVideoUrl }: ProductVideoProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [thumbnailIndex, setThumbnailIndex] = useState(0);
  const video = getYouTubeVideoMeta(youtubeVideoUrl);

  if (!video) {
    return null;
  }

  const thumbnailUrl = video.thumbnailUrls[thumbnailIndex] ?? video.thumbnailUrls[video.thumbnailUrls.length - 1];

  return (
    <div className="product-video">
      {isPlaying ? (
        <iframe
          title={`${productName} video`}
          src={`${video.embedUrl}?autoplay=1&rel=0`}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
          referrerPolicy="strict-origin-when-cross-origin"
        />
      ) : (
        <button type="button" aria-label={`Play ${productName} video`} onClick={() => setIsPlaying(true)}>
          <img
            src={thumbnailUrl}
            alt={`${productName} YouTube video preview`}
            loading="lazy"
            onError={() => setThumbnailIndex((currentIndex) => Math.min(currentIndex + 1, video.thumbnailUrls.length - 1))}
            suppressHydrationWarning
          />
          <span>Play</span>
        </button>
      )}
    </div>
  );
}
