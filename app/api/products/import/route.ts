import { NextResponse } from "next/server"
import { pool } from "@/lib/db"
import { getCurrentUser } from "@/lib/current"
import { getBusinessByUserId } from "@/lib/business"
import { parseCsv } from "@/lib/csv"
import { rateLimit } from "@/lib/rate-limit"
import { getClientIp, requireCsrf } from "@/lib/security"

function normalizeHeader(h: string) {
  const key = h.trim().toLowerCase()
  const map: Record<string, string> = {
    "اسم المنتج": "name",
    "اسم_المنتج": "name",
    "اسم-المنتج": "name",
    "المنتج": "name",
    "product name": "name",
    "product_name": "name",
    "name": "name",
    "sku": "sku",
    "رمز المنتج": "sku",
    "رمز_المنتج": "sku",
    "رمز-المنتج": "sku",
    "الوحدة": "unit_code",
    "رمز الوحدة": "unit_code",
    "unit": "unit_code",
    "unit_code": "unit_code",
    "السعر": "default_unit_price",
    "السعر الافتراضي": "default_unit_price",
    "default_unit_price": "default_unit_price",
    "vat_category": "vat_category",
    "تصنيف الضريبة": "vat_category",
    "vat_rate": "vat_rate",
    "معدل الضريبة": "vat_rate",
  }
  return map[key] ?? key
}

type Row = Record<string, string>

export async function POST(req: Request) {
  if (!requireCsrf(req)) {
    return NextResponse.json({ error: "CSRF validation failed" }, { status: 403 })
  }

  const ip = getClientIp(req)
  const rl = rateLimit(`products:import:${ip}`, 10, 60_000)
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

  const form = await req.formData()
  const file = form.get("file")
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Missing file" }, { status: 400 })
  }

  const text = await file.text()
  const rows = parseCsv(text)
  if (rows.length < 2) {
    return NextResponse.json({ error: "CSV is empty" }, { status: 400 })
  }

  const headers = rows[0].map(normalizeHeader)
  if (!headers.includes("name")) {
    return NextResponse.json({ error: "Missing required column: name" }, { status: 400 })
  }

  const parsed: Row[] = rows.slice(1).map((r) => {
    const obj: Row = {}
    headers.forEach((h, i) => {
      obj[h] = r[i] ?? ""
    })
    return obj
  })

  const unitsRes = await pool.query(`SELECT code FROM units`)
  const unitSet = new Set<string>(unitsRes.rows.map((r: any) => String(r.code).toUpperCase()))

  let created = 0
  let skipped = 0

  const client = await pool.connect()
  try {
    await client.query("BEGIN")

    for (const r of parsed) {
      const name = String(r.name ?? "").trim()
      if (!name) {
        skipped += 1
        continue
      }

      const sku = r.sku ? String(r.sku).trim() : null
      const unitCodeRaw = r.unit_code ? String(r.unit_code).trim().toUpperCase() : null
      const unitCode = unitCodeRaw && unitSet.has(unitCodeRaw) ? unitCodeRaw : null
      const price = Number(r.default_unit_price ?? 0)
      const vatCategory = r.vat_category ? String(r.vat_category).trim().toLowerCase() : null
      const vatRate = Number(r.vat_rate ?? 0.15)

      if (!Number.isFinite(price) || price < 0) {
        skipped += 1
        continue
      }
      if (!Number.isFinite(vatRate) || vatRate < 0 || vatRate > 1) {
        skipped += 1
        continue
      }

      const existing = await client.query(
        `SELECT id FROM products WHERE business_id = $1 AND name = $2 AND (sku IS NOT DISTINCT FROM $3) LIMIT 1`,
        [business.id, name, sku]
      )
      if (existing.rows[0]) {
        skipped += 1
        continue
      }

      const res = await client.query(
        `INSERT INTO products (business_id, name, sku, unit_code, default_unit_price, vat_category, vat_rate)
         VALUES ($1,$2,$3,$4,$5,$6,$7)
         RETURNING id`,
        [business.id, name, sku, unitCode, price, vatCategory, vatRate]
      )

      if (res.rows[0]) created += 1
      else skipped += 1
    }

    await client.query("COMMIT")
  } catch (e) {
    await client.query("ROLLBACK")
    console.error("PRODUCTS IMPORT ERROR:", e)
    return NextResponse.json({ error: "Import failed" }, { status: 500 })
  } finally {
    client.release()
  }

  return NextResponse.json({ ok: true, created, skipped })
}
