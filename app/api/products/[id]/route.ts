import { NextResponse } from "next/server"
import { pool } from "@/lib/db"
import { getCurrentUser } from "@/lib/current"
import { getBusinessByUserId } from "@/lib/business"
import { requireCsrf } from "@/lib/security"

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await requireCsrf(req))) {
    return NextResponse.json({ error: "CSRF validation failed" }, { status: 403 })
  }

  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const business = await getBusinessByUserId(user.userId)
  if (!business?.id) return NextResponse.json({ error: "Business not found" }, { status: 400 })

  const { id } = await params
  const body = await req.json().catch(() => ({}))
  const name = String(body?.name ?? "").trim()
  const sku = body?.sku ? String(body.sku).trim() : null
  const unitCode = body?.unit_code ? String(body.unit_code).trim().toUpperCase() : null
  const defaultUnitPrice = Number(body?.default_unit_price ?? 0)
  const vatCategory = body?.vat_category ? String(body.vat_category).trim().toLowerCase() : null
  const vatRate = Number(body?.vat_rate ?? 0.15)

  if (!name) return NextResponse.json({ error: "Missing name" }, { status: 400 })
  if (!Number.isFinite(defaultUnitPrice) || defaultUnitPrice < 0) {
    return NextResponse.json({ error: "Invalid price" }, { status: 400 })
  }
  if (!Number.isFinite(vatRate) || vatRate < 0 || vatRate > 1) {
    return NextResponse.json({ error: "Invalid VAT rate" }, { status: 400 })
  }

  const res = await pool.query(
    `UPDATE products
     SET name = $1, sku = $2, unit_code = $3, default_unit_price = $4, vat_category = $5, vat_rate = $6
     WHERE id = $7 AND business_id = $8
     RETURNING id, name, sku, unit_code, default_unit_price, vat_category, vat_rate`,
    [name, sku, unitCode, defaultUnitPrice, vatCategory, vatRate, id, business.id]
  )
  if (!res.rows[0]) return NextResponse.json({ error: "Not found" }, { status: 404 })
  return NextResponse.json({ product: res.rows[0] })
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await requireCsrf(req))) {
    return NextResponse.json({ error: "CSRF validation failed" }, { status: 403 })
  }

  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const business = await getBusinessByUserId(user.userId)
  if (!business?.id) return NextResponse.json({ error: "Business not found" }, { status: 400 })

  const { id } = await params
  const res = await pool.query(
    `UPDATE products SET active = false WHERE id = $1 AND business_id = $2 RETURNING id`,
    [id, business.id]
  )
  if (!res.rows[0]) return NextResponse.json({ error: "Not found" }, { status: 404 })
  return NextResponse.json({ ok: true })
}
