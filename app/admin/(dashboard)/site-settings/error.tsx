"use client";

export default function SiteSettingsError({ reset }: { reset: () => void }) {
  return <section role="alert"><h1>Site Settings unavailable</h1><p>The settings operation could not be completed. Check the database connection, then reload saved settings before retrying. Default branding is never saved automatically.</p><button onClick={reset} type="button">Reload settings</button></section>;
}
