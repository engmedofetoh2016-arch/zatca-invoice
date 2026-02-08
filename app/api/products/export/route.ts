import { NextResponse } from "next/server"
import { pool } from "@/lib/db"
import { getCurrentUser } from "@/lib/current"
import { getBusinessByUserId } from "@/lib/business"
import { toCsv } from "@/lib/csv"

export async function GET() {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const business = await getBusinessByUserId(user.userId)
  if (!business?.id) return NextResponse.json({ error: "Business not found" }, { status: 400 })

  const res = await pool.query(
    `SELECT name, sku, unit_code, default_unit_price, vat_category, vat_rate
     FROM products
     WHERE business_id = $1 AND active = true
     ORDER BY name ASC`,
    [business.id]
  )

  const rows = [
    ["name", "sku", "unit_code", "default_unit_price", "vat_category", "vat_rate"],
    ...res.rows.map((r: any) => [
      r.name ?? "",
      r.sku ?? "",
      r.unit_code ?? "",
      r.default_unit_price ?? "",
      r.vat_category ?? "",
      r.vat_rate ?? "",
    ]),
  ]

  const csv = toCsv(rows)

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": "attachment; filename=products.csv",
    },
  })
}
