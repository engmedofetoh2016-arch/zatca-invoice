import { pool } from "@/lib/db"
import { cookies } from "next/headers"
import { verifyToken } from "@/lib/auth"
import { rateLimit } from "@/lib/rate-limit"
import { getClientIp, requireCsrf } from "@/lib/security"

export async function POST(req: Request) {
  const cookieStore = await cookies()
  const token = cookieStore.get("token")?.value

  const user = token ? verifyToken(token) : null
  if (!user) return new Response("Unauthorized", { status: 401 })

  const ip = getClientIp(req)
  const rl = rateLimit(`business:update:${ip}`, 20, 60_000)
  if (!rl.ok) {
    return new Response("Too many requests", {
      status: 429,
      headers: { "Retry-After": String(rl.retryAfter) },
    })
  }

  const form = await req.formData()
  const csrfToken = String(form.get("csrf") ?? "")
  if (!requireCsrf(req, csrfToken)) {
    return new Response("CSRF validation failed", { status: 403 })
  }
  const name = form.get("name")
  const vat = form.get("vat")
  const cr = form.get("cr")

  if (!name || !vat || !cr) {
    return new Response("Missing fields", { status: 400 })
  }

  await pool.query(
    `
    INSERT INTO businesses (user_id, name, vat_number, cr_number)
    VALUES ($1, $2, $3, $4)
    ON CONFLICT (user_id)
    DO UPDATE SET
      name = EXCLUDED.name,
      vat_number = EXCLUDED.vat_number,
      cr_number = EXCLUDED.cr_number
    `,
    [user.userId, name, vat, cr]
  )

  const bizRes = await pool.query(
    `SELECT id FROM businesses WHERE user_id = $1 ORDER BY created_at DESC LIMIT 1`,
    [user.userId]
  )
  const businessId = bizRes.rows[0]?.id
  if (businessId) {
    await pool.query(
      `INSERT INTO business_memberships (business_id, user_id, role)
       VALUES ($1,$2,'owner')
       ON CONFLICT (business_id, user_id) DO NOTHING`,
      [businessId, user.userId]
    )
  }

  return new Response(null, {
  status: 302,
  headers: { Location: "/dashboard?saved=1" },
})

}
