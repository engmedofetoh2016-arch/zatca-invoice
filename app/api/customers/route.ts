import { NextResponse } from "next/server"
import { pool } from "@/lib/db"
import { getCurrentUser } from "@/lib/current"
import { getBusinessByUserId } from "@/lib/business"
import { getClientIp, requireCsrf } from "@/lib/security"
import { rateLimit } from "@/lib/rate-limit"

export async function GET(req: Request) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const business = await getBusinessByUserId(user.userId)
  if (!business?.id) return NextResponse.json({ error: "Business not found" }, { status: 400 })

  const url = new URL(req.url)
  const query = (url.searchParams.get("q") || "").trim()

  const values: Array<string> = [business.id]
  let where = "business_id = $1"
  if (query) {
    values.push(`%${query}%`)
    where += ` AND (name ILIKE $${values.length} OR vat_number ILIKE $${values.length})`
  }

  const res = await pool.query(
    `SELECT id, name, vat_number
     FROM customers
     WHERE ${where}
     ORDER BY created_at DESC
     LIMIT 50`,
    values
  )

  return NextResponse.json({ ok: true, customers: res.rows })
}

export async function POST(req: Request) {
  if (!requireCsrf(req)) {
    return NextResponse.json({ error: "CSRF validation failed" }, { status: 403 })
  }

  const ip = getClientIp(req)
  const rl = rateLimit(`customers:create:${ip}`, 30, 60_000)
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
  const name = String(body?.name ?? "").trim()
  const vatNumber = body?.vat_number ? String(body.vat_number).trim() : null

  if (!name) return NextResponse.json({ error: "Name is required" }, { status: 400 })
  if (name.length > 200) return NextResponse.json({ error: "Name is too long" }, { status: 400 })

  if (vatNumber) {
    const existingVat = await pool.query(
      `SELECT id, name, vat_number FROM customers WHERE business_id = $1 AND vat_number = $2 LIMIT 1`,
      [business.id, vatNumber]
    )
    if (existingVat.rows[0]) {
      return NextResponse.json({ ok: true, customer: existingVat.rows[0] })
    }
  }

  const existingName = await pool.query(
    `SELECT id, name, vat_number
     FROM customers
     WHERE business_id = $1 AND name_normalized = lower(regexp_replace(trim($2), '\\s+', ' ', 'g'))
     AND (vat_number IS NOT DISTINCT FROM $3)
     LIMIT 1`,
    [business.id, name, vatNumber]
  )
  if (existingName.rows[0]) {
    return NextResponse.json({ ok: true, customer: existingName.rows[0] })
  }

  const res = await pool.query(
    `INSERT INTO customers (business_id, name, vat_number)
     VALUES ($1,$2,$3)
     RETURNING id, name, vat_number`,
    [business.id, name, vatNumber]
  )

  return NextResponse.json({ ok: true, customer: res.rows[0] })
}
