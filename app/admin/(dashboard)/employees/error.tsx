"use client";
import Link from "next/link";
export default function EmployeeError({ reset }: { reset: () => void }) {
  return <section role="alert"><h1>Team profiles are unavailable here</h1><p>We could not load this part of the CMS. Try reloading, or ask your developer to check the Team CMS setup and connection.</p><button type="button" onClick={reset}>Try loading team profiles again</button><p><Link href="/admin">Return to dashboard</Link></p></section>;
}
