"use server";

import { AuthError } from "next-auth";
import { isRedirectError } from "next/dist/client/components/redirect-error";
import { redirect } from "next/navigation";
import { signIn } from "../../../../lib/auth";
import { adminLoginSchema } from "../../../../lib/validations/auth";
import type { AdminLoginActionState } from "./validation";

function getSafeCallbackUrl(value: FormDataEntryValue | null) {
  if (typeof value !== "string") {
    return "/admin";
  }

  if (!value.startsWith("/admin") || value.startsWith("//") || value.startsWith("/admin/login")) {
    return "/admin";
  }

  return value;
}

export async function adminLoginAction(
  _previousState: AdminLoginActionState,
  formData: FormData,
): Promise<AdminLoginActionState> {
  console.info("[admin-login] action started");

  const parsed = adminLoginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    console.info("[admin-login] validation failed");

    return {
      error: parsed.error.issues[0]?.message ?? "Please check your login details.",
      message: "",
    };
  }

  const redirectTarget = getSafeCallbackUrl(formData.get("callbackUrl"));

  console.info("[admin-login] email received", parsed.data.email);
  console.info("[admin-login] redirect target", redirectTarget);

  try {
    await signIn("credentials", {
      email: parsed.data.email,
      password: parsed.data.password,
      redirectTo: redirectTarget,
    });
  } catch (error) {
    if (isRedirectError(error)) {
      console.info("[admin-login] credentials signIn success; Auth.js redirect issued", redirectTarget);
      throw error;
    }

    if (error instanceof AuthError) {
      console.info("[admin-login] credentials signIn failure", error.type);

      return {
        error: "Invalid email or password.",
        message: "",
      };
    }

    console.error("[admin-login] server action failed", error);

    return {
      error: "Server action failed. Please try again or check the server logs.",
      message: "",
    };
  }

  console.info("[admin-login] credentials signIn success; applying Next.js redirect", redirectTarget);

  try {
    redirect(redirectTarget);
  } catch (error) {
    if (isRedirectError(error)) {
      throw error;
    }

    console.error("[admin-login] redirect failed", error);

    return {
      error: "Sign in succeeded but redirect failed. Please open /admin manually.",
      message: "",
    };
  }

  return {
    error: "",
    message: "Sign in succeeded. Redirecting to admin...",
  };
}
