import { NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/current"
import { getBusinessByUserId } from "@/lib/business"
import { createKeypairAndCsr } from "@/lib/zatca/certificates"
import { rateLimit } from "@/lib/rate-limit"
import { getClientIp, requireCsrf } from "@/lib/security"

export async function POST(req: Request) {
  if (!requireCsrf(req)) {
    return NextResponse.json({ error: "CSRF validation failed" }, { status: 403 })
  }

  const ip = getClientIp(req)
  const rl = rateLimit(`zatca:csr:${ip}`, 5, 60_000)
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
  const commonName = String(body.commonName ?? business.name ?? "Business").trim()
  const organization = String(body.organization ?? business.name ?? "Business").trim()
  const country = String(body.country ?? "SA").trim()

  const result = await createKeypairAndCsr({
    businessId: business.id,
    commonName,
    organization,
    country,
  })

  return NextResponse.json({ ok: true, ...result })
}
