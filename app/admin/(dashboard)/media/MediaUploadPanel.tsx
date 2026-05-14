"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import AdminImageUpload from "../_components/AdminImageUpload";
import styles from "../brands/page.module.css";

export default function MediaUploadPanel() {
  const router = useRouter();
  const [imageUrl, setImageUrl] = useState("");
  const [message, setMessage] = useState("");

  function handleUploaded(url: string) {
    setImageUrl(url);

    if (url) {
      setMessage("Image uploaded and added to the media library.");
      router.refresh();
    } else {
      setMessage("");
    }
  }

  return (
    <div className={styles.brandForm}>
      <AdminImageUpload
        folder="media"
        label="Upload Image"
        name="mediaUrl"
        onChange={handleUploaded}
        value={imageUrl}
      />
      {message ? <p className={styles.formSuccess}>{message}</p> : null}
    </div>
  );
}
