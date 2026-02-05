import { cookies } from "next/headers";

export function getClientIp(req: Request) {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0].trim();
  return req.headers.get("x-real-ip") ?? "unknown";
}

// ✅ Next 16: cookies() is async
export async function csrfCookieValue() {
  const cookieStore = await cookies();
  return cookieStore.get("csrf")?.value ?? null;
}

export async function requireCsrf(req: Request) {
  const cookieStore = await cookies();
  const csrfCookie = cookieStore.get("csrf")?.value ?? "";
  const csrfHeader = req.headers.get("x-csrf-token") ?? "";
  return csrfCookie !== "" && csrfCookie === csrfHeader;
}

export async function requireCsrfToken(token: string) {
  const cookieStore = await cookies();
  const csrfCookie = cookieStore.get("csrf")?.value ?? "";
  return csrfCookie !== "" && csrfCookie === token;
}
