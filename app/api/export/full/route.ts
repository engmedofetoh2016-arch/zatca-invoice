import { NextResponse } from "next/server"
import { pool } from "@/lib/db"
import { getCurrentUser } from "@/lib/current"
import { getBusinessByUserId } from "@/lib/business"
import * as XLSX from "xlsx"

export async function GET() {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const business = await getBusinessByUserId(user.userId)
  if (!business?.id) return NextResponse.json({ error: "Business not found" }, { status: 400 })

  const [invoicesRes, itemsRes, customersRes] = await Promise.all([
    pool.query(
      `SELECT id, business_id, customer_id, invoice_number, issue_date, customer_name, customer_vat, subtotal, vat_amount, total, status, invoice_type, original_invoice_id, note_reason
       FROM invoices
       WHERE business_id = $1
       ORDER BY created_at DESC`,
      [business.id]
    ),
    pool.query(
      `SELECT invoice_id, description, qty, unit_price, line_total, vat_rate, vat_amount, vat_exempt_reason, unit_code, vat_category
       FROM invoice_items
       WHERE invoice_id IN (SELECT id FROM invoices WHERE business_id = $1)
       ORDER BY invoice_id`,
      [business.id]
    ),
    pool.query(
      `SELECT id, name, vat_number, created_at
       FROM customers
       WHERE business_id = $1
       ORDER BY created_at DESC`,
      [business.id]
    ),
  ])

  const wb = XLSX.utils.book_new()
  const invoicesSheet = XLSX.utils.json_to_sheet(invoicesRes.rows)
  const itemsSheet = XLSX.utils.json_to_sheet(itemsRes.rows)
  const customersSheet = XLSX.utils.json_to_sheet(customersRes.rows)

  XLSX.utils.book_append_sheet(wb, invoicesSheet, "invoices")
  XLSX.utils.book_append_sheet(wb, itemsSheet, "invoice_items")
  XLSX.utils.book_append_sheet(wb, customersSheet, "customers")

  const buffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" })

  return new Response(buffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": "attachment; filename=full-export.xlsx",
    },
  })
}
