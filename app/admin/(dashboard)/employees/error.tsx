"use client";
import Link from "next/link";
export default function EmployeeError({ reset }: { reset: () => void }) {
  return <section role="alert"><h1>Employee management is unavailable</h1><p>No fallback employee records are shown. Verify that the intended development database has the employee migrations, or try again when the connection is available.</p><button type="button" onClick={reset}>Reload this page</button><p><Link href="/admin">Return to dashboard</Link></p></section>;
}
