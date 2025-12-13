import { NextResponse } from "next/server"
import { pool } from "@/lib/db"
import { getCurrentUser, getCurrentBusinessId } from "@/lib/current"

type Item = { description: string; qty: number; unitPrice: number }

export async function POST(req: Request) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const businessId = await getCurrentBusinessId(user.userId)
  if (!businessId) return NextResponse.json({ error: "Business not found" }, { status: 400 })

  const body = await req.json()
  const invoiceNumber = String(body.invoiceNumber || "")
  const customerName = body.customerName ? String(body.customerName) : null
  const customerVat = body.customerVat ? String(body.customerVat) : null
  const items: Item[] = Array.isArray(body.items) ? body.items : []

  if (!invoiceNumber || items.length === 0) {
    return NextResponse.json({ error: "Missing invoiceNumber or items" }, { status: 400 })
  }

  // compute totals
  const subtotal = items.reduce((s, it) => s + Number(it.qty) * Number(it.unitPrice), 0)
  const vatRate = 0.15
  const vatAmount = +(subtotal * vatRate).toFixed(2)
  const total = +(subtotal + vatAmount).toFixed(2)

  const client = await pool.connect()
  try {
    await client.query("BEGIN")

    const invRes = await client.query(
      `
      INSERT INTO invoices (business_id, invoice_number, customer_name, customer_vat, subtotal, vat_amount, total)
      VALUES ($1,$2,$3,$4,$5,$6,$7)
      RETURNING id
      `,
      [businessId, invoiceNumber, customerName, customerVat, subtotal, vatAmount, total]
    )

    const invoiceId = invRes.rows[0].id as string

    for (const it of items) {
      const qty = Number(it.qty || 1)
      const unitPrice = Number(it.unitPrice || 0)
      const lineTotal = +(qty * unitPrice).toFixed(2)

      await client.query(
        `
        INSERT INTO invoice_items (invoice_id, description, qty, unit_price, line_total)
        VALUES ($1,$2,$3,$4,$5)
        `,
        [invoiceId, String(it.description || ""), qty, unitPrice, lineTotal]
      )
    }

    await client.query("COMMIT")
    return NextResponse.json({ ok: true, invoiceId })
  } catch (e) {
    await client.query("ROLLBACK")
    return NextResponse.json({ error: "Server error" }, { status: 500 })
  } finally {
    client.release()
  }
}
