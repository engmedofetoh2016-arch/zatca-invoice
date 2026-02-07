import { NextResponse } from "next/server"
import { pool } from "@/lib/db"
import { getCurrentUser } from "@/lib/current"
import { getBusinessByUserId } from "@/lib/business"
import { parseCsv } from "@/lib/csv"
import { rateLimit } from "@/lib/rate-limit"
import { getClientIp, requireCsrf } from "@/lib/security"

type Row = Record<string, string>

function normalizeHeader(h: string) {
  const key = h.trim().toLowerCase()
  const map: Record<string, string> = {
    "رقم الفاتورة": "invoice_number",
    "رقم_الفاتورة": "invoice_number",
    "رقم-الفاتورة": "invoice_number",
    "invoice no": "invoice_number",
    "invoice_no": "invoice_number",
    "invoice number": "invoice_number",
    "وصف الصنف": "item_description",
    "وصف_الصنف": "item_description",
    "وصف-الصنف": "item_description",
    "وصف السلعة": "item_description",
    "وصف_السلعة": "item_description",
    "وصف-السلعة": "item_description",
    "item description": "item_description",
    "item_desc": "item_description",
    "الكمية": "item_qty",
    "كميه": "item_qty",
    "qty": "item_qty",
    "quantity": "item_qty",
    "سعر الوحدة": "item_unit_price",
    "سعر_الوحدة": "item_unit_price",
    "سعر-الوحدة": "item_unit_price",
    "unit price": "item_unit_price",
    "unit_price": "item_unit_price",
    "معدل الضريبة": "item_vat_rate",
    "معدل_الضريبة": "item_vat_rate",
    "vat rate": "item_vat_rate",
    "vat_rate": "item_vat_rate",
    "سبب الإعفاء": "item_vat_exempt_reason",
    "سبب_الإعفاء": "item_vat_exempt_reason",
    "سبب الاعفاء": "item_vat_exempt_reason",
    "سبب_الاعفاء": "item_vat_exempt_reason",
    "vat exempt reason": "item_vat_exempt_reason",
    "unit": "item_unit_code",
    "unit code": "item_unit_code",
    "unit_code": "item_unit_code",
    "item unit": "item_unit_code",
    "item_unit": "item_unit_code",
    "item_unit_code": "item_unit_code",
    "vat category": "item_vat_category",
    "vat_category": "item_vat_category",
    "item vat category": "item_vat_category",
    "item_vat_category": "item_vat_category",
    "invoice type": "invoice_type",
    "invoice_type": "invoice_type",
    "نوع الفاتورة": "invoice_type",
    "نوع_الفاتورة": "invoice_type",
    "رقم الفاتورة الأصلية": "original_invoice_id",
    "رقم_الفاتورة_الأصلية": "original_invoice_id",
    "رقم الفاتورة الاصلية": "original_invoice_id",
    "رقم_الفاتورة_الاصلية": "original_invoice_id",
    "original invoice id": "original_invoice_id",
    "original_invoice_id": "original_invoice_id",
    "سبب الإشعار": "note_reason",
    "سبب_الإشعار": "note_reason",
    "سبب الاشعار": "note_reason",
    "سبب_الاشعار": "note_reason",
    "note reason": "note_reason",
    "note_reason": "note_reason",
    "اسم العميل": "customer_name",
    "اسم_العميل": "customer_name",
    "customer name": "customer_name",
    "customer_name": "customer_name",
    "رقم ضريبة العميل": "customer_vat",
    "رقم_ضريبة_العميل": "customer_vat",
    "customer vat": "customer_vat",
    "customer_vat": "customer_vat",
    "تاريخ الفاتورة": "issue_date",
    "تاريخ_الفاتورة": "issue_date",
    "issue date": "issue_date",
    "issue_date": "issue_date",
  }
  return map[key] ?? key
}

export async function POST(req: Request) {
  if (!requireCsrf(req)) {
    return NextResponse.json({ error: "CSRF validation failed" }, { status: 403 })
  }

  const ip = getClientIp(req)
  const rl = rateLimit(`invoice:import:${ip}`, 10, 60_000)
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
  const hasInvoiceNumber = headers.includes("invoice_number")
  const itemRequired = ["item_description", "item_qty", "item_unit_price"]
  const hasItemCols = itemRequired.every((r) => headers.includes(r))
  const totalsRequired = ["subtotal", "vat_amount", "total"]
  const hasTotals = totalsRequired.every((r) => headers.includes(r))
  if (!hasInvoiceNumber) {
    return NextResponse.json({ error: "العمود المطلوب مفقود: invoice_number" }, { status: 400 })
  }
  if (!hasItemCols && !hasTotals) {
    return NextResponse.json(
      { error: "يجب توفير أعمدة الأصناف أو أعمدة الإجمالي (subtotal, vat_amount, total)" },
      { status: 400 }
    )
  }

  const parsed: Row[] = rows.slice(1).map((r) => {
    const obj: Row = {}
    headers.forEach((h, i) => {
      obj[h] = r[i] ?? ""
    })
    return obj
  })

  const byInvoice = new Map<string, Row[]>()
  parsed.forEach((r) => {
    const number = String(r.invoice_number ?? "").trim()
    if (!number) return
    const arr = byInvoice.get(number) ?? []
    arr.push(r)
    byInvoice.set(number, arr)
  })

  const client = await pool.connect()
  let created = 0
  try {
    await client.query("BEGIN")

    for (const [invoiceNumber, items] of byInvoice.entries()) {
      const issueDate = items[0]?.issue_date ? new Date(items[0].issue_date) : new Date()
      const customerName = items[0]?.customer_name ? String(items[0].customer_name).trim() : null
      const customerVat = items[0]?.customer_vat ? String(items[0].customer_vat).trim() : null
      const rawType = items[0]?.invoice_type ? String(items[0].invoice_type).trim() : "invoice"
      const invoiceType = rawType === "credit" || rawType === "debit" ? rawType : "invoice"
      const originalInvoiceId = items[0]?.original_invoice_id ? String(items[0].original_invoice_id).trim() : null
      const noteReason = items[0]?.note_reason ? String(items[0].note_reason).trim() : null
      const rawStatus = items[0]?.status ? String(items[0].status).trim() : "issued"
      const status =
        rawStatus === "draft" ||
        rawStatus === "issued" ||
        rawStatus === "reported" ||
        rawStatus === "cleared" ||
        rawStatus === "rejected"
          ? rawStatus
          : "issued"
      if ((invoiceType === "credit" || invoiceType === "debit") && !originalInvoiceId) {
        continue
      }

      const computed = hasItemCols
        ? items.map((it) => {
            const description = String(it.item_description ?? "").trim()
            const qty = Number(it.item_qty ?? 0)
            const unitPrice = Number(it.item_unit_price ?? 0)
            const vatRate = it.item_vat_rate ? Number(it.item_vat_rate) : 0.15
            const vatExemptReason = it.item_vat_exempt_reason ? String(it.item_vat_exempt_reason).trim() : null
            const unitCode = it.item_unit_code ? String(it.item_unit_code).trim() : null
            const vatCategory = it.item_vat_category ? String(it.item_vat_category).trim().toLowerCase() : null
            const lineTotal = +(qty * unitPrice).toFixed(2)
            return { description, qty, unitPrice, vatRate, vatExemptReason, unitCode, vatCategory, lineTotal }
          }).filter((it) => it.description && it.qty > 0)
        : []

      if (hasItemCols && computed.length === 0) continue

      const subtotal = hasItemCols
        ? computed.reduce((s, it) => s + it.lineTotal, 0)
        : Number(items[0]?.subtotal ?? 0)
      const vatAmount = hasItemCols
        ? +computed.reduce((s, it) => s + it.lineTotal * (it.vatRate ?? 0), 0).toFixed(2)
        : Number(items[0]?.vat_amount ?? 0)
      const total = hasItemCols
        ? +(subtotal + vatAmount).toFixed(2)
        : Number(items[0]?.total ?? (subtotal + vatAmount))
      const sign = invoiceType === "credit" ? -1 : 1
      const signedSubtotal = +(subtotal * sign).toFixed(2)
      const signedVatAmount = +(vatAmount * sign).toFixed(2)
      const signedTotal = +(total * sign).toFixed(2)

      const invRes = await client.query(
        `INSERT INTO invoices (business_id, invoice_number, issue_date, customer_name, customer_vat, subtotal, vat_amount, total, status, status_changed_at, invoice_type, original_invoice_id, note_reason)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,NOW(),$10,$11,$12)
         RETURNING id`,
        [business.id, invoiceNumber, issueDate, customerName, customerVat, signedSubtotal, signedVatAmount, signedTotal, status, invoiceType, originalInvoiceId, noteReason]
      )
      const invoiceId = invRes.rows[0].id as string

      for (const it of computed) {
        await client.query(
          `INSERT INTO invoice_items (invoice_id, description, qty, unit_price, line_total, vat_rate, vat_amount, vat_exempt_reason, unit_code, vat_category)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
          [invoiceId, it.description, it.qty, it.unitPrice, it.lineTotal, it.vatRate ?? 0.15, +(it.lineTotal * (it.vatRate ?? 0)).toFixed(2), it.vatExemptReason, it.unitCode, it.vatCategory]
        )
      }

      created += 1
    }

    await client.query("COMMIT")
  } catch (e) {
    await client.query("ROLLBACK")
    console.error("IMPORT ERROR:", e)
    return NextResponse.json({ error: "Import failed" }, { status: 500 })
  } finally {
    client.release()
  }

  return NextResponse.json({ ok: true, created })
}
