"use client";

import { Share2 } from "lucide-react";

export default function ShareButton() {
  async function shareProduct() {
    const shareData = {
      title: document.title,
      url: window.location.href,
    };

    if (navigator.share) {
      await navigator.share(shareData);
      return;
    }

    await navigator.clipboard.writeText(window.location.href);
  }

  return (
    <button className="product-share" onClick={shareProduct} type="button">
      <Share2 size={15} />
      Share
    </button>
  );
}
