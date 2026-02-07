import { NextResponse } from "next/server"
import { pool } from "@/lib/db"
import { validateInvoiceInput } from "@/lib/validators"
import { sha256Hex } from "@/lib/crypto"
import { buildUblInvoice, hashInvoiceXml } from "@/lib/zatca/ubl"
import { enqueueZatcaJob } from "@/lib/zatca/queue"

async function authenticate(req: Request) {
  const token = req.headers.get("x-api-token")
  if (!token) return null
  const hash = sha256Hex(token)
  const res = await pool.query(
    `SELECT business_id FROM api_tokens WHERE token_hash = $1 AND revoked_at IS NULL LIMIT 1`,
    [hash]
  )
  return res.rows[0]?.business_id ?? null
}

export async function POST(req: Request) {
  const businessId = await authenticate(req)
  if (!businessId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = await req.json().catch(() => ({}))
  const validated = validateInvoiceInput(body)
  if (!validated.ok) {
    return NextResponse.json({ error: "Validation failed", details: validated.errors }, { status: 400 })
  }

  const invoiceNumber = validated.invoiceNumber
  const customerName = validated.customerName
  const customerVat = validated.customerVat
  const items = validated.items

  const subtotal = items.reduce((s, it) => s + it.qty * it.unitPrice, 0)
  const vatAmount = +items
    .reduce((s, it) => s + (it.qty * it.unitPrice) * (it.vatRate ?? 0), 0)
    .toFixed(2)
  const total = +(subtotal + vatAmount).toFixed(2)

  const ubl = buildUblInvoice({
    invoiceNumber,
    issueDate: new Date().toISOString().slice(0, 10),
    sellerName: body.sellerName ?? "Business",
    sellerVat: body.sellerVat ?? "",
    buyerName: customerName,
    buyerVat: customerVat,
    subtotal,
    vatAmount,
    total,
    items: items.map((it) => ({
      description: it.description,
      qty: it.qty,
      unitPrice: it.unitPrice,
      lineTotal: +(it.qty * it.unitPrice).toFixed(2),
      vatRate: it.vatRate ?? 0,
      vatAmount: +((it.qty * it.unitPrice) * (it.vatRate ?? 0)).toFixed(2),
      unitCode: it.unitCode ?? null,
      vatCategory: it.vatCategory ?? null,
    })),
  })
  const invoiceHash = hashInvoiceXml(ubl.xml)

  const client = await pool.connect()
  try {
    await client.query("BEGIN")
    const icvRes = await client.query(
      `SELECT COUNT(*)::int AS count FROM invoices WHERE business_id = $1`,
      [businessId]
    )
    const icv = (icvRes.rows[0]?.count ?? 0) + 1

    const invRes = await client.query(
      `INSERT INTO invoices (business_id, invoice_number, customer_name, customer_vat, subtotal, vat_amount, total, status, status_changed_at, invoice_type, original_invoice_id, note_reason)
       VALUES ($1,$2,$3,$4,$5,$6,$7,'issued',NOW(),'invoice',NULL,NULL)
       RETURNING id`,
      [businessId, invoiceNumber, customerName, customerVat, subtotal, vatAmount, total]
    )
    const invoiceId = invRes.rows[0].id as string

    await client.query(
      `UPDATE invoices SET uuid = $1, icv = $2, invoice_hash = $3, xml_payload = $4 WHERE id = $5`,
      [ubl.uuid, icv, invoiceHash, ubl.xml, invoiceId]
    )

    for (const it of items) {
      const lineTotal = +(it.qty * it.unitPrice).toFixed(2)
      const lineVat = +(lineTotal * (it.vatRate ?? 0)).toFixed(2)
      await client.query(
        `INSERT INTO invoice_items (invoice_id, description, qty, unit_price, line_total, vat_rate, vat_amount, vat_exempt_reason, unit_code, vat_category, product_id)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
        [invoiceId, it.description, it.qty, it.unitPrice, lineTotal, it.vatRate ?? 0, lineVat, it.vatExemptReason ?? null, it.unitCode ?? null, it.vatCategory ?? null, it.productId ?? null]
      )
    }

    await enqueueZatcaJob({ businessId, invoiceId, jobType: "report" })
    await client.query("COMMIT")

    return NextResponse.json({ ok: true, invoiceId })
  } catch (e) {
    await client.query("ROLLBACK")
    return NextResponse.json({ error: "Server error" }, { status: 500 })
  } finally {
    client.release()
  }
}
