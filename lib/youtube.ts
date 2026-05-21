const youtubeVideoIdPattern = /^[A-Za-z0-9_-]{11}$/;

function cleanVideoId(value: string | null) {
  const id = value?.trim() ?? "";
  return youtubeVideoIdPattern.test(id) ? id : null;
}

export function getYouTubeVideoId(value: string | null | undefined) {
  const trimmedValue = value?.trim();

  if (!trimmedValue) {
    return null;
  }

  try {
    const url = new URL(trimmedValue);
    const hostname = url.hostname.replace(/^www\./, "").toLowerCase();
    const pathParts = url.pathname.split("/").filter(Boolean);

    if (hostname === "youtu.be") {
      return cleanVideoId(pathParts[0] ?? null);
    }

    if (hostname === "youtube.com" || hostname === "m.youtube.com" || hostname === "youtube-nocookie.com") {
      if (url.pathname === "/watch") {
        return cleanVideoId(url.searchParams.get("v"));
      }

      if (pathParts[0] === "shorts" || pathParts[0] === "embed") {
        return cleanVideoId(pathParts[1] ?? null);
      }
    }
  } catch {
    return null;
  }

  return null;
}

export function getYouTubeThumbnailUrl(videoId: string) {
  return getYouTubeThumbnailUrls(videoId)[0];
}

export function getYouTubeThumbnailUrls(videoId: string) {
  return [
    `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`,
    `https://img.youtube.com/vi/${videoId}/sddefault.jpg`,
    `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
  ];
}

export function getYouTubeEmbedUrl(videoId: string) {
  return `https://www.youtube-nocookie.com/embed/${videoId}`;
}

export function getYouTubeVideoMeta(value: string | null | undefined) {
  const videoId = getYouTubeVideoId(value);

  if (!videoId) {
    return null;
  }

  return {
    embedUrl: getYouTubeEmbedUrl(videoId),
    thumbnailUrl: getYouTubeThumbnailUrl(videoId),
    thumbnailUrls: getYouTubeThumbnailUrls(videoId),
    videoId,
  };
}
