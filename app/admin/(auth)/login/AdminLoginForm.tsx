"use client";

import { useActionState } from "react";
import { useSearchParams } from "next/navigation";
import { adminLoginAction } from "./actions";
import styles from "./page.module.css";
import { initialAdminLoginActionState } from "./validation";

function getSafeCallbackUrl(value: string | null) {
  if (!value || !value.startsWith("/admin") || value.startsWith("//") || value.startsWith("/admin/login")) {
    return "/admin";
  }

  return value;
}

export default function AdminLoginForm() {
  const searchParams = useSearchParams();
  const callbackUrl = getSafeCallbackUrl(searchParams.get("callbackUrl"));
  const [state, formAction, isSubmitting] = useActionState(adminLoginAction, initialAdminLoginActionState);

  return (
    <form action={formAction} className={styles.form}>
      <input name="callbackUrl" type="hidden" value={callbackUrl} />
      <label className={styles.field}>
        <span>Email</span>
        <input autoComplete="email" name="email" placeholder="admin@example.com" type="email" />
      </label>
      <label className={styles.field}>
        <span>Password</span>
        <input autoComplete="current-password" name="password" placeholder="Your password" type="password" />
      </label>
      {state.error ? <p className={styles.error}>{state.error}</p> : null}
      {state.message ? <p className={styles.message}>{state.message}</p> : null}
      <button className={styles.submitButton} disabled={isSubmitting} type="submit">
        {isSubmitting ? "Signing in..." : "Sign in"}
      </button>
    </form>
  );
}
