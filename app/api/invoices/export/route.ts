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

  const invRes = await pool.query(
    `SELECT invoice_number, issue_date, customer_name, customer_vat, subtotal, vat_amount, total, status, invoice_type, original_invoice_id, note_reason
     FROM invoices
     WHERE business_id = $1
     ORDER BY created_at DESC`,
    [business.id]
  )

  const rows = [
    ["invoice_number", "issue_date", "customer_name", "customer_vat", "subtotal", "vat_amount", "total", "status", "invoice_type", "original_invoice_id", "note_reason"],
    ...invRes.rows.map((r) => [
      r.invoice_number,
      new Date(r.issue_date).toISOString(),
      r.customer_name ?? "",
      r.customer_vat ?? "",
      Number(r.subtotal).toFixed(2),
      Number(r.vat_amount).toFixed(2),
      Number(r.total).toFixed(2),
      r.status ?? "",
      r.invoice_type ?? "invoice",
      r.original_invoice_id ?? "",
      r.note_reason ?? "",
    ]),
  ]

  const csv = toCsv(rows)
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": "attachment; filename=\"invoices.csv\"",
    },
  })
}
