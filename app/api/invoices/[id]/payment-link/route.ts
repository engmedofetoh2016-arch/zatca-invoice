import { NextResponse } from "next/server"
import { pool } from "@/lib/db"
import { getCurrentUser } from "@/lib/current"
import { getBusinessByUserId } from "@/lib/business"
import { rateLimit } from "@/lib/rate-limit"
import { getClientIp, requireCsrf } from "@/lib/security"

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!requireCsrf(req)) {
    return NextResponse.json({ error: "CSRF validation failed" }, { status: 403 })
  }

  const ip = getClientIp(req)
  const rl = rateLimit(`invoice:payment:${ip}`, 30, 60_000)
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

  const { id } = await params
  const body = await req.json().catch(() => ({}))
  const link = String(body.link ?? "").trim()
  if (!link) return NextResponse.json({ error: "Missing link" }, { status: 400 })

  await pool.query(
    `UPDATE invoices SET payment_link = $1 WHERE id = $2 AND business_id = $3`,
    [link, id, business.id]
  )

  return NextResponse.json({ ok: true })
}
