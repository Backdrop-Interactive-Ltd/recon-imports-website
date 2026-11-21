"use client";
import { useEffect, useRef, useState } from "react";
import styles from "./page.module.css";

export default function EmployeeIdentityControls({ employeeCode, profileUrl, canExport }: {
  employeeCode: string; profileUrl: string; canExport: boolean;
}) {
  const [message, setMessage] = useState("");
  const [preview, setPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const cached = useRef<{ code: string; url: string; etag: string | null } | null>(null);
  const busy = useRef(false);
  const generation = useRef(0);
  const qrUrl = `/api/admin/employees/${encodeURIComponent(employeeCode)}/qr`;
  function clearPreview() {
    if (cached.current) URL.revokeObjectURL(cached.current.url);
    cached.current = null; setPreview(null);
  }
  useEffect(() => {
    generation.current++; clearPreview(); busy.current = false; setLoading(false);
    return () => { generation.current++; if (cached.current) URL.revokeObjectURL(cached.current.url); cached.current = null; };
  }, [employeeCode, canExport]);
  async function loadQr(download: boolean) {
    if (busy.current || !canExport) return;
    const current = generation.current;
    busy.current = true; setLoading(true); setMessage("");
    try {
      const headers: Record<string, string> = {};
      if (cached.current?.code === employeeCode && cached.current.etag) headers["If-None-Match"] = cached.current.etag;
      // Every preview/download click reauthorizes, including when pixels already exist locally.
      const response = await fetch(qrUrl, { headers, cache: "no-store", credentials: "same-origin" });
      if (current !== generation.current) return;
      if (response.status === 304 && cached.current?.code === employeeCode) {
        setPreview(cached.current.url);
      } else {
        if (!response.ok || !response.headers.get("Content-Type")?.startsWith("image/png")) throw Error("QR unavailable");
        const blob = await response.blob();
        if (current !== generation.current) return;
        clearPreview();
        const url = URL.createObjectURL(blob);
        cached.current = { code: employeeCode, url, etag: response.headers.get("ETag") }; setPreview(url);
      }
      if (download && cached.current) {
        const link = document.createElement("a"); link.href = cached.current.url; link.download = `${employeeCode}-qr.png`;
        document.body.appendChild(link); link.click(); link.remove();
      }
      setMessage(download ? "QR code downloaded." : "QR preview ready.");
    } catch {
      if (current !== generation.current) return;
      clearPreview(); setMessage("QR unavailable. Reload or sign in again; you may no longer have access.");
    } finally { if (current === generation.current) { busy.current = false; setLoading(false); } }
  }
  return <div>
    <p><a href={profileUrl} target="_blank" rel="noopener noreferrer">Open public profile</a></p>
    <button type="button" onClick={async () => {
      try { await navigator.clipboard.writeText(profileUrl); setMessage("Profile link copied."); }
      catch { setMessage("Copy was unavailable. Select and copy the profile URL shown above."); }
    }}>Copy Profile Link</button>
    {canExport ? <div style={{ marginTop: 20 }}>
      <button type="button" disabled={loading} onClick={() => loadQr(false)}>Show QR Preview</button>
      <button className={styles.button} type="button" disabled={loading} onClick={() => loadQr(true)}>Download QR Code (PNG)</button>
      {preview && <p><img src={preview} alt={`Permanent profile QR code for ${employeeCode}`} width={240} height={240} style={{ maxWidth: "100%", height: "auto" }} /></p>}
    </div> : <p>QR downloads require a SUPER_ADMIN.</p>}
    <p>QR codes always point to the production profile URL. They remain the same after resignation or rejoining. An unpublished profile shows no personal information.</p>
    <p role="status" aria-live="polite">{loading ? "Loading QR code..." : message}</p>
  </div>;
}
