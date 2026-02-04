import { NextResponse } from "next/server"
import { pool } from "@/lib/db"
import { getCurrentUser } from "@/lib/current"
import { getBusinessByUserId } from "@/lib/business"

export async function GET() {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const business = await getBusinessByUserId(user.userId)
  if (!business?.id) return NextResponse.json({ error: "Business not found" }, { status: 400 })

  const res = await pool.query(
    `SELECT COALESCE(
       MAX(NULLIF(regexp_replace(invoice_number, '[^0-9]', '', 'g'), '')::int),
       0
     ) + 1 AS next
     FROM invoices
     WHERE business_id = $1`,
    [business.id]
  )

  const next = Number(res.rows[0]?.next ?? 1)
  const formatted = `INV-${String(next).padStart(4, "0")}`

  return NextResponse.json({ next: formatted })
}
