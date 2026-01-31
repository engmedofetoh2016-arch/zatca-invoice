import { NextResponse } from "next/server"
import { pool } from "@/lib/db"
import { getCurrentUser } from "@/lib/current"
import { getBusinessByUserId } from "@/lib/business"
import { validateInvoiceInput } from "@/lib/validators"
import { rateLimit } from "@/lib/rate-limit"
import { getClientIp, requireCsrf } from "@/lib/security"
import { buildUblInvoice, hashInvoiceXml } from "@/lib/zatca/ubl"
import { enqueueZatcaJob } from "@/lib/zatca/queue"
import { auditLog } from "@/lib/audit"

type Item = { description: string; qty: number; unitPrice: number; vatRate: number; vatExemptReason?: string | null }

export async function POST(req: Request) {
  if (!requireCsrf(req)) {
    return NextResponse.json({ error: "CSRF validation failed" }, { status: 403 })
  }

  const ip = getClientIp(req)
  const rl = rateLimit(`invoice:create:${ip}`, 60, 60_000)
  if (!rl.ok) {
    return NextResponse.json(
      { error: "Too many requests" },
      { status: 429, headers: { "Retry-After": String(rl.retryAfter) } }
    )
  }

  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  // ✅ Use the same helper as dashboard/pages/pdf
  const business = await getBusinessByUserId(user.userId)
  if (!business?.id) return NextResponse.json({ error: "Business not found" }, { status: 400 })
  const businessId = business.id

  const body = await req.json()
  const requestedStatus = String(body?.status ?? "issued").trim()
  const status = requestedStatus === "draft" ? "draft" : "issued"
  const validated = validateInvoiceInput(body, { allowEmptyItems: status === "draft" })
  if (!validated.ok) {
    return NextResponse.json({ error: "Validation failed", details: validated.errors }, { status: 400 })
  }

  const invoiceNumber = validated.invoiceNumber
  const customerName = validated.customerName
  const customerVat = validated.customerVat
  const items: Item[] = validated.items
  const invoiceType = validated.invoiceType === "credit" || validated.invoiceType === "debit" ? validated.invoiceType : "invoice"
  const originalInvoiceId = validated.originalInvoiceId
  const noteReason = validated.noteReason

  if (status === "issued" && items.length === 0) {
    return NextResponse.json({ error: "items is required for issued invoices" }, { status: 400 })
  }

  if ((invoiceType === "credit" || invoiceType === "debit") && !originalInvoiceId) {
    return NextResponse.json({ error: "originalInvoiceId is required for credit/debit notes" }, { status: 400 })
  }

  const subtotal = items.reduce((s, it) => s + it.qty * it.unitPrice, 0)
  const vatAmount = +items
    .reduce((s, it) => s + (it.qty * it.unitPrice) * (it.vatRate ?? 0), 0)
    .toFixed(2)
  const total = +(subtotal + vatAmount).toFixed(2)
  const sign = invoiceType === "credit" ? -1 : 1
  const signedSubtotal = +(subtotal * sign).toFixed(2)
  const signedVatAmount = +(vatAmount * sign).toFixed(2)
  const signedTotal = +(total * sign).toFixed(2)

  const client = await pool.connect()
  try {
    await client.query("BEGIN")

    const icvRes = await client.query(
      `SELECT COUNT(*)::int AS count FROM invoices WHERE business_id = $1`,
      [businessId]
    )
    const icv = (icvRes.rows[0]?.count ?? 0) + 1

    const ubl = buildUblInvoice({
      invoiceNumber,
      issueDate: new Date().toISOString().slice(0, 10),
      sellerName: business.name,
      sellerVat: business.vat_number,
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
      })),
    })
    const invoiceHash = hashInvoiceXml(ubl.xml)

    const invRes = await client.query(
      `INSERT INTO invoices (business_id, invoice_number, customer_name, customer_vat, subtotal, vat_amount, total, status, status_changed_at, invoice_type, original_invoice_id, note_reason)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,NOW(),$9,$10,$11)
       RETURNING id`,
      [businessId, invoiceNumber, customerName, customerVat, signedSubtotal, signedVatAmount, signedTotal, status, invoiceType, originalInvoiceId, noteReason]
    )

    const invoiceId = invRes.rows[0].id as string

    await client.query(
      `UPDATE invoices SET uuid = $1, icv = $2, invoice_hash = $3, xml_payload = $4 WHERE id = $5`,
      [ubl.uuid, icv, invoiceHash, ubl.xml, invoiceId]
    )

      for (const it of items) {
        const description = String(it.description || "").trim()
        if (!description) continue

        const qty = Number(it.qty || 1)
        const unitPrice = Number(it.unitPrice || 0)
        const lineTotal = +(qty * unitPrice).toFixed(2)
        const vatRate = Number(it.vatRate ?? 0.15)
        const vatAmount = +(lineTotal * vatRate).toFixed(2)
        const vatExemptReason = it.vatExemptReason ? String(it.vatExemptReason) : null

        await client.query(
          `INSERT INTO invoice_items (invoice_id, description, qty, unit_price, line_total, vat_rate, vat_amount, vat_exempt_reason)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
        [invoiceId, description, qty, unitPrice, lineTotal, vatRate, vatAmount, vatExemptReason]
        )
      }

    if (status === "issued") {
      await enqueueZatcaJob({ businessId, invoiceId, jobType: "report" })
    }
    await auditLog({ businessId, userId: user.userId, action: "invoice.created", entityType: "invoice", entityId: invoiceId })

    await client.query("COMMIT")
    return NextResponse.json({ ok: true, invoiceId })
  } catch (e) {
    await client.query("ROLLBACK")
    console.error("CREATE INVOICE ERROR:", e)
    return NextResponse.json({ error: "Server error" }, { status: 500 })
  } finally {
    client.release()
  }
}
