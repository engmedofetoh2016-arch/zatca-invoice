import { NextResponse } from "next/server"
import { pool } from "@/lib/db"
import { getCurrentUser } from "@/lib/current"
import { getBusinessByUserId } from "@/lib/business"
import { getClientIp, requireCsrf } from "@/lib/security"
import { rateLimit } from "@/lib/rate-limit"

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!requireCsrf(req)) {
    return NextResponse.json({ error: "CSRF validation failed" }, { status: 403 })
  }

  const ip = getClientIp(req)
  const rl = rateLimit(`customers:update:${ip}`, 60, 60_000)
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
  const body = await req.json()
  const name = String(body?.name ?? "").trim()
  const vatNumber = body?.vat_number ? String(body.vat_number).trim() : null

  if (!name) return NextResponse.json({ error: "Name is required" }, { status: 400 })
  if (name.length > 200) return NextResponse.json({ error: "Name is too long" }, { status: 400 })

  const res = await pool.query(
    `UPDATE customers
     SET name = $1, vat_number = $2
     WHERE id = $3 AND business_id = $4
     RETURNING id, name, vat_number`,
    [name, vatNumber, id, business.id]
  )

  if (!res.rows[0]) return NextResponse.json({ error: "Not found" }, { status: 404 })

  return NextResponse.json({ ok: true, customer: res.rows[0] })
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!requireCsrf(req)) {
    return NextResponse.json({ error: "CSRF validation failed" }, { status: 403 })
  }

  const ip = getClientIp(req)
  const rl = rateLimit(`customers:delete:${ip}`, 30, 60_000)
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
  const res = await pool.query(
    `DELETE FROM customers WHERE id = $1 AND business_id = $2 RETURNING id`,
    [id, business.id]
  )

  if (!res.rows[0]) return NextResponse.json({ error: "Not found" }, { status: 404 })

  return NextResponse.json({ ok: true })
}
