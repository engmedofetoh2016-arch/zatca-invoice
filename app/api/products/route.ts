import { NextResponse } from "next/server"
import { pool } from "@/lib/db"
import { getCurrentUser } from "@/lib/current"
import { getBusinessByUserId } from "@/lib/business"
import { requireCsrf } from "@/lib/security"

export async function GET(req: Request) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const business = await getBusinessByUserId(user.userId)
  if (!business?.id) return NextResponse.json({ error: "Business not found" }, { status: 400 })

  const { searchParams } = new URL(req.url)
  const q = String(searchParams.get("q") ?? "").trim()

  const res = await pool.query(
    `SELECT id, name, sku, unit_code, default_unit_price, vat_category, vat_rate
     FROM products
     WHERE business_id = $1
       AND active = true
       AND ($2 = '' OR name ILIKE '%' || $2 || '%' OR sku ILIKE '%' || $2 || '%')
     ORDER BY name ASC
     LIMIT 50`,
    [business.id, q]
  )

  return NextResponse.json({ products: res.rows })
}

export async function POST(req: Request) {
  if (!requireCsrf(req)) {
    return NextResponse.json({ error: "CSRF validation failed" }, { status: 403 })
  }

  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const business = await getBusinessByUserId(user.userId)
  if (!business?.id) return NextResponse.json({ error: "Business not found" }, { status: 400 })

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
    `INSERT INTO products (business_id, name, sku, unit_code, default_unit_price, vat_category, vat_rate)
     VALUES ($1,$2,$3,$4,$5,$6,$7)
     RETURNING id, name, sku, unit_code, default_unit_price, vat_category, vat_rate`,
    [business.id, name, sku, unitCode, defaultUnitPrice, vatCategory, vatRate]
  )

  return NextResponse.json({ product: res.rows[0] })
}
