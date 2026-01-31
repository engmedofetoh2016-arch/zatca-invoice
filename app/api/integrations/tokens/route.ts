import { NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/current"
import { getBusinessByUserId } from "@/lib/business"
import { rateLimit } from "@/lib/rate-limit"
import { getClientIp, requireCsrf } from "@/lib/security"
import { pool } from "@/lib/db"
import { sha256Hex, randomUuid } from "@/lib/crypto"

export async function GET() {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const business = await getBusinessByUserId(user.userId)
  if (!business?.id) return NextResponse.json({ error: "Business not found" }, { status: 400 })

  const res = await pool.query(
    `SELECT id, name, created_at, revoked_at FROM api_tokens WHERE business_id = $1 ORDER BY created_at DESC`,
    [business.id]
  )
  return NextResponse.json({ ok: true, tokens: res.rows })
}

export async function POST(req: Request) {
  if (!requireCsrf(req)) {
    return NextResponse.json({ error: "CSRF validation failed" }, { status: 403 })
  }
  const ip = getClientIp(req)
  const rl = rateLimit(`api-token:create:${ip}`, 10, 60_000)
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
  const name = String(body.name ?? "API Token").trim()

  const token = `zatca_${randomUuid()}`
  const tokenHash = sha256Hex(token)

  const res = await pool.query(
    `INSERT INTO api_tokens (business_id, name, token_hash) VALUES ($1,$2,$3) RETURNING id`,
    [business.id, name, tokenHash]
  )

  return NextResponse.json({ ok: true, id: res.rows[0].id, token })
}
