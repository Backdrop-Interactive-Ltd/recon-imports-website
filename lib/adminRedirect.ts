export function getSafeAdminRedirect({ baseUrl, url }: { baseUrl: string; url: string }): string {
  let base: URL;
  try { base = new URL(baseUrl); } catch { return "/admin"; }
  if (!["http:", "https:"].includes(base.protocol) || base.username || base.password) return "/admin";
  const fallback = new URL("/admin", base.origin).href;
  // Reject ambiguous URL syntax before the URL parser can normalize it.
  if (!url || /[\u0000-\u0020\u007f\\]/.test(url) || url.startsWith("//")) return fallback;
  if (!url.startsWith("/") && !/^https?:\/\//i.test(url)) return fallback;
  try {
    const target = new URL(url, base.origin);
    const adminPath = target.pathname === "/admin" || target.pathname.startsWith("/admin/");
    const loginPath = target.pathname === "/admin/login" || target.pathname.startsWith("/admin/login/");
    if (target.origin !== base.origin || target.username || target.password || !adminPath || loginPath) return fallback;
    return target.href;
  } catch { return fallback; }
}
