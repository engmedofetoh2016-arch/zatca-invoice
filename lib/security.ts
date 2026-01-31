import { cookies } from "next/headers"

export function getClientIp(req: Request) {
  const xff = req.headers.get("x-forwarded-for")
  if (xff) return xff.split(",")[0].trim()
  return req.headers.get("x-real-ip") ?? "unknown"
}

export function csrfCookieValue() {
  return cookies().get("csrf")?.value ?? null
}

export function requireCsrf(req: Request, formToken?: string | null) {
  const cookieToken = csrfCookieValue()
  const headerToken = req.headers.get("x-csrf-token")
  const token = headerToken ?? formToken
  return Boolean(token && cookieToken && token === cookieToken)
}
