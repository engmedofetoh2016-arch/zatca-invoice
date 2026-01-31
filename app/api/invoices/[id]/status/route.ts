import { NextResponse } from "next/server"
import { pool } from "@/lib/db"
import { getCurrentUser } from "@/lib/current"
import { getBusinessByUserId } from "@/lib/business"
import { rateLimit } from "@/lib/rate-limit"
import { getClientIp, requireCsrf } from "@/lib/security"
import { enqueueZatcaJob } from "@/lib/zatca/queue"
import { auditLog } from "@/lib/audit"

const allowedTransitions: Record<string, Set<string>> = {
  draft: new Set(["issued", "rejected"]),
  issued: new Set(["reported", "cleared", "rejected"]),
  reported: new Set(["cleared", "rejected"]),
  cleared: new Set([]),
  rejected: new Set([]),
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!requireCsrf(req)) {
    return NextResponse.json({ error: "CSRF validation failed" }, { status: 403 })
  }

  const ip = getClientIp(req)
  const rl = rateLimit(`invoice:status:${ip}`, 60, 60_000)
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
  const nextStatus = String(body?.status ?? "").trim()
  if (!nextStatus) {
    return NextResponse.json({ error: "Missing status" }, { status: 400 })
  }

  const invRes = await pool.query(
    `SELECT status FROM invoices WHERE id = $1 AND business_id = $2`,
    [id, business.id]
  )
  const inv = invRes.rows[0]
  if (!inv) return NextResponse.json({ error: "Invoice not found" }, { status: 404 })

  const currentStatus = String(inv.status ?? "")
  const allowed = allowedTransitions[currentStatus] ?? new Set<string>()
  if (!allowed.has(nextStatus)) {
    return NextResponse.json(
      { error: "Invalid status transition", currentStatus, nextStatus },
      { status: 400 }
    )
  }

  if (nextStatus === "issued") {
    const countRes = await pool.query(
      `SELECT COUNT(*)::int AS count FROM invoice_items WHERE invoice_id = $1`,
      [id]
    )
    if ((countRes.rows[0]?.count ?? 0) === 0) {
      return NextResponse.json({ error: "Cannot issue invoice without items" }, { status: 400 })
    }
  }

  await pool.query(
    `UPDATE invoices SET status = $1, status_changed_at = NOW() WHERE id = $2 AND business_id = $3`,
    [nextStatus, id, business.id]
  )

  if (nextStatus === "reported") {
    await enqueueZatcaJob({ businessId: business.id, invoiceId: id, jobType: "report" })
  }
  if (nextStatus === "cleared") {
    await enqueueZatcaJob({ businessId: business.id, invoiceId: id, jobType: "clear" })
  }
  await auditLog({ businessId: business.id, userId: user.userId, action: "invoice.status", entityType: "invoice", entityId: id, metadata: { from: currentStatus, to: nextStatus } })

  return NextResponse.json({ ok: true, status: nextStatus })
}
