import { rateLimit } from "@/lib/rate-limit"
import { getClientIp, requireCsrf } from "@/lib/security"
import { cookies } from "next/headers"
import { verifyToken } from "@/lib/auth"
import { pool } from "@/lib/db"

// app/api/auth/logout/route.ts
export async function POST(req: Request) {
  const ip = getClientIp(req)
  const rl = rateLimit(`logout:${ip}`, 30, 60_000)
  if (!rl.ok) {
    return new Response(JSON.stringify({ error: "Too many requests" }), {
      status: 429,
      headers: { "Content-Type": "application/json", "Retry-After": String(rl.retryAfter) },
    })
  }

  if (!requireCsrf(req)) {
    return new Response(JSON.stringify({ error: "CSRF validation failed" }), {
      status: 403,
      headers: { "Content-Type": "application/json" },
    })
  }

  const cookieStore = await cookies()
  const token = cookieStore.get("token")?.value
  const decoded = token ? verifyToken(token) : null
  if (decoded?.userId && decoded?.jti) {
    await pool.query(
      `UPDATE user_sessions SET revoked_at = NOW() WHERE user_id = $1 AND jti = $2`,
      [decoded.userId, decoded.jti]
    )
  }

  const isProd = process.env.NODE_ENV === "production"
  const secure = isProd ? " Secure;" : ""
  return new Response(JSON.stringify({ ok: true }), {
    headers: {
      "Content-Type": "application/json",
      "Set-Cookie": `token=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0;${secure}`,
    },
  })
}
