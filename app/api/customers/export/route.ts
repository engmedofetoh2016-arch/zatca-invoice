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
    `SELECT name, vat_number
     FROM customers
     WHERE business_id = $1
     ORDER BY created_at DESC`,
    [business.id]
  )

  const rows = [
    ["name", "vat_number"],
    ...res.rows.map((r: any) => [r.name ?? "", r.vat_number ?? ""]),
  ]

  const csv = toCsv(rows)

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": "attachment; filename=customers.csv",
    },
  })
}
