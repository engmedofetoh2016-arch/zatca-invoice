import { NextResponse } from "next/server"
import { pool } from "@/lib/db"
import { getCurrentUser } from "@/lib/current"
import { getBusinessByUserId } from "@/lib/business"
import { getClientIp, requireCsrf } from "@/lib/security"
import { rateLimit } from "@/lib/rate-limit"

export async function POST(req: Request) {
  if (!requireCsrf(req)) {
    return NextResponse.json({ error: "CSRF validation failed" }, { status: 403 })
  }

  const ip = getClientIp(req)
  const rl = rateLimit(`zatca:settings:${ip}`, 20, 60_000)
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

  const body = await req.json()
  const environment = String(body?.environment ?? "sandbox")
  const csid = body?.csid ? String(body.csid).trim() : null
  const pcsid = body?.pcsid ? String(body.pcsid).trim() : null
  const certificatePem = body?.certificate_pem ? String(body.certificate_pem).trim() : null

  await pool.query(
    `INSERT INTO zatca_settings (business_id, environment, csid, pcsid, certificate_pem)
     VALUES ($1,$2,$3,$4,$5)
     ON CONFLICT (business_id)
     DO UPDATE SET environment = EXCLUDED.environment, csid = EXCLUDED.csid, pcsid = EXCLUDED.pcsid, certificate_pem = EXCLUDED.certificate_pem`,
    [business.id, environment, csid, pcsid, certificatePem]
  )

  return NextResponse.json({ ok: true })
}
