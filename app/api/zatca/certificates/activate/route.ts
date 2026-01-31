import { NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/current"
import { getBusinessByUserId } from "@/lib/business"
import { activateCertificate } from "@/lib/zatca/certificates"
import { rateLimit } from "@/lib/rate-limit"
import { getClientIp, requireCsrf } from "@/lib/security"

export async function POST(req: Request) {
  if (!requireCsrf(req)) {
    return NextResponse.json({ error: "CSRF validation failed" }, { status: 403 })
  }

  const ip = getClientIp(req)
  const rl = rateLimit(`zatca:activate:${ip}`, 5, 60_000)
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
  const certificateId = String(body.certificateId ?? "").trim()
  const certificatePem = String(body.certificatePem ?? "").trim()
  const csid = body.csid ? String(body.csid).trim() : null
  const pcsid = body.pcsid ? String(body.pcsid).trim() : null
  const expiresAt = body.expiresAt ? String(body.expiresAt).trim() : null

  if (!certificateId || !certificatePem) {
    return NextResponse.json({ error: "Missing certificateId or certificatePem" }, { status: 400 })
  }

  await activateCertificate({ certificateId, certificatePem, csid, pcsid, expiresAt })
  return NextResponse.json({ ok: true })
}
