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
    `SELECT id, type, name, config, created_at FROM integrations WHERE business_id = $1 ORDER BY created_at DESC`,
    [business.id]
  )
  return NextResponse.json({ ok: true, integrations: res.rows })
}

export async function POST(req: Request) {
  if (!requireCsrf(req)) {
    return NextResponse.json({ error: "CSRF validation failed" }, { status: 403 })
  }
  const ip = getClientIp(req)
  const rl = rateLimit(`integrations:create:${ip}`, 20, 60_000)
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
  const type = String(body.type ?? "").trim()
  const name = String(body.name ?? "").trim()
  const config = body.config ?? {}

  if (!type || !name) {
    return NextResponse.json({ error: "Missing type or name" }, { status: 400 })
  }

  const res = await pool.query(
    `INSERT INTO integrations (business_id, type, name, config)
     VALUES ($1,$2,$3,$4)
     RETURNING id`,
    [business.id, type, name, config]
  )
  return NextResponse.json({ ok: true, id: res.rows[0].id })
}
