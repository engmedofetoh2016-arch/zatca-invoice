import { NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/current"
import { getBusinessByUserId } from "@/lib/business"
import { rateLimit } from "@/lib/rate-limit"
import { getClientIp, requireCsrf } from "@/lib/security"
import { pool } from "@/lib/db"

export async function GET() {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const business = await getBusinessByUserId(user.userId)
  if (!business?.id) return NextResponse.json({ error: "Business not found" }, { status: 400 })

  const res = await pool.query(
    `SELECT u.id, u.email, bm.role
     FROM business_memberships bm
     JOIN users u ON u.id = bm.user_id
     WHERE bm.business_id = $1
     ORDER BY u.email ASC`,
    [business.id]
  )

  return NextResponse.json({ ok: true, members: res.rows })
}

export async function POST(req: Request) {
  if (!requireCsrf(req)) {
    return NextResponse.json({ error: "CSRF validation failed" }, { status: 403 })
  }
  const ip = getClientIp(req)
  const rl = rateLimit(`business:members:${ip}`, 20, 60_000)
  if (!rl.ok) {
    return NextResponse.json(
      { error: "Too many requests" },
      { status: 429, headers: { "Retry-After": String(rl.retryAfter) } }
    )
  }

  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const business = await getBusinessByUserId(user.userId)
  if (!business?.id) return NextResponse.json({ error: "Business not found" }, { status: 400 })

  const body = await req.json().catch(() => ({}))
  const email = String(body.email ?? "").trim().toLowerCase()
  const role = String(body.role ?? "member").trim()

  if (!email) return NextResponse.json({ error: "Missing email" }, { status: 400 })

  const uRes = await pool.query(`SELECT id FROM users WHERE email = $1`, [email])
  const target = uRes.rows[0]
  if (!target) return NextResponse.json({ error: "User not found" }, { status: 404 })

  await pool.query(
    `INSERT INTO business_memberships (business_id, user_id, role)
     VALUES ($1,$2,$3)
     ON CONFLICT (business_id, user_id) DO UPDATE SET role = EXCLUDED.role`,
    [business.id, target.id, role]
  )

  return NextResponse.json({ ok: true })
}
