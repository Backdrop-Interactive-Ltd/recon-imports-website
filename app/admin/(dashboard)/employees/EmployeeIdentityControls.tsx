"use client";
import { useState } from "react";
import styles from "./page.module.css";

export default function EmployeeIdentityControls({ employeeCode, profileUrl, canExport }: {
  employeeCode: string; profileUrl: string; canExport: boolean;
}) {
  const [message, setMessage] = useState("");
  const qrUrl = `/api/admin/employees/${encodeURIComponent(employeeCode)}/qr`;
  return <div>
    <p><a href={profileUrl} target="_blank" rel="noopener noreferrer">Open public profile</a></p>
    <button type="button" onClick={async () => {
      try { await navigator.clipboard.writeText(profileUrl); setMessage("Profile link copied."); }
      catch { setMessage("Copy was unavailable. Select and copy the profile URL shown above."); }
    }}>Copy Profile Link</button>
    {canExport ? <div style={{ marginTop: 20 }}>
      <img src={qrUrl} alt={`Permanent profile QR code for ${employeeCode}`} width={240} height={240} style={{ maxWidth: "100%", height: "auto" }} onError={() => setMessage("QR preview could not load. Reload or sign in again.")} />
      <p><a className={styles.button} href={`${qrUrl}?download=1`} download={`${employeeCode}-qr.png`}>Download QR Code (PNG)</a></p>
    </div> : <p>QR downloads require a SUPER_ADMIN.</p>}
    <p>QR codes always point to the production profile URL. They remain the same after resignation or rejoining. An unpublished profile shows no personal information.</p>
    <p role="status" aria-live="polite">{message}</p>
  </div>;
}
