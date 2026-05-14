"use client";

import { useEffect, useId, useRef, useState } from "react";
import {
  ADMIN_IMAGE_UPLOAD_ACCEPT,
  formatUploadSize,
  validateAdminImageFile,
  ADMIN_IMAGE_UPLOAD_MAX_BYTES,
} from "../../../../lib/uploads/imageRules";
import styles from "./AdminImageUpload.module.css";

type AdminImageUploadProps = {
  error?: string;
  folder: "brands" | "cars" | "categories" | "hero" | "homepage" | "media";
  label: string;
  name: string;
  onChange: (url: string) => void;
  value: string;
};

type UploadResponse = {
  error?: string;
  url?: string;
};

export default function AdminImageUpload({ error, folder, label, name, onChange, value }: AdminImageUploadProps) {
  const inputId = useId();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadError, setUploadError] = useState("");
  const [uploadMessage, setUploadMessage] = useState("");
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    if (!value && fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }, [value]);

  async function handleFileChange(file: File | undefined) {
    setUploadError("");
    setUploadMessage("");

    if (!file) {
      return;
    }

    const validationError = validateAdminImageFile({
      name: file.name,
      size: file.size,
      type: file.type,
    });

    if (validationError) {
      setUploadError(validationError);
      return;
    }

    const uploadData = new FormData();
    uploadData.append("file", file);
    uploadData.append("folder", folder);
    setIsUploading(true);

    try {
      const response = await fetch("/api/admin/uploads", {
        body: uploadData,
        method: "POST",
      });
      const result = (await response.json()) as UploadResponse;

      if (!response.ok || !result.url) {
        setUploadError(result.error || "Image upload failed. Please try again.");
        return;
      }

      onChange(result.url);
      setUploadMessage("Image uploaded successfully.");
    } catch {
      setUploadError("Image upload failed. Please check your connection.");
    } finally {
      setIsUploading(false);
    }
  }

  function handleClearImage() {
    onChange("");
    setUploadError("");
    setUploadMessage("");

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  return (
    <div className={styles.uploadField}>
      <input name={name} type="hidden" value={value} />
      <label className={styles.label} htmlFor={inputId}>
        {label}
      </label>

      <div className={styles.uploadBox}>
        <div className={styles.previewBox}>
          {value ? <img alt={`${label} preview`} src={value} /> : <span>No image selected</span>}
        </div>

        <div className={styles.controls}>
          <input
            accept={ADMIN_IMAGE_UPLOAD_ACCEPT}
            className={styles.fileInput}
            disabled={isUploading}
            id={inputId}
            onChange={(event) => handleFileChange(event.target.files?.[0])}
            ref={fileInputRef}
            type="file"
          />
          <p>
            Allowed: jpg, jpeg, png, webp, svg. Max size: {formatUploadSize(ADMIN_IMAGE_UPLOAD_MAX_BYTES)}.
          </p>
          {value ? (
            <button className={styles.clearButton} disabled={isUploading} onClick={handleClearImage} type="button">
              Remove image
            </button>
          ) : null}
        </div>
      </div>

      {isUploading ? <p className={styles.status}>Uploading image...</p> : null}
      {uploadMessage ? <p className={styles.success}>{uploadMessage}</p> : null}
      {uploadError || error ? <p className={styles.error}>{uploadError || error}</p> : null}
    </div>
  );
}
