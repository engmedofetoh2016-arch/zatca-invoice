export const runtime = "nodejs"
export const dynamic = "force-dynamic"

import path from "node:path"
import { readFile } from "node:fs/promises"
import { NextResponse } from "next/server"
import { chromium } from "playwright"
import { pool } from "@/lib/db"
import { zatcaQrDataUrl } from "@/lib/zatca"
import { getCurrentUser, getCurrentBusinessId } from "@/lib/current"

function formatSarAr(amount: number) {
  return new Intl.NumberFormat("ar-SA", { style: "currency", currency: "SAR" }).format(amount)
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const businessId = await getCurrentBusinessId(user.userId)
    if (!businessId) return NextResponse.json({ error: "Business not found" }, { status: 400 })

    const invRes = await pool.query(
      `
      SELECT i.*, b.name AS seller_name, b.vat_number AS seller_vat, b.cr_number AS seller_cr
      FROM invoices i
      JOIN businesses b ON b.id = i.business_id
      WHERE i.id = $1 AND i.business_id = $2
      `,
      [id, businessId]
    )
    const inv = invRes.rows[0]
    if (!inv) return NextResponse.json({ error: "Invoice not found" }, { status: 404 })

    const itemsRes = await pool.query(
      `SELECT description, qty, unit_price, line_total, vat_rate, vat_amount, vat_exempt_reason
       FROM invoice_items WHERE invoice_id = $1 ORDER BY id`,
      [id]
    )

    const fontPath = path.join(process.cwd(), "public", "fonts", "Cairo-Regular.ttf")
    const fontBase64 = (await readFile(fontPath)).toString("base64")

    let qrDataUrl = ""
    try {
      const issueDate = new Date(inv.issue_date)
      const timestampISO = Number.isNaN(issueDate.getTime())
        ? new Date().toISOString()
        : issueDate.toISOString()
      qrDataUrl = await zatcaQrDataUrl({
        sellerName: String(inv.seller_name ?? ""),
        vatNumber: String(inv.seller_vat ?? ""),
        timestampISO,
        total: Number(inv.total ?? 0).toFixed(2),
        vatAmount: Number(inv.vat_amount ?? 0).toFixed(2),
      })
    } catch (e) {
      console.error("QR ERROR:", e)
    }

    const titleAr =
      inv.invoice_type === "credit"
        ? "إشعار دائن"
        : inv.invoice_type === "debit"
        ? "إشعار مدين"
        : "فاتورة ضريبية"

    const itemsHtml = itemsRes.rows
      .map((it: any) => {
        const ratePct = ((Number(it.vat_rate) || 0) * 100).toFixed(0)
        return `
          <div class="item">
            <div class="item-name">${it.description ?? "-"}</div>
            <div class="item-total">${formatSarAr(Number(it.line_total ?? 0))}</div>
            <div class="item-meta">الكمية: ${Number(it.qty ?? 0).toFixed(2)} × السعر: ${Number(it.unit_price ?? 0).toFixed(2)}</div>
            <div class="item-meta">VAT: ${ratePct}% | ${formatSarAr(Number(it.vat_amount ?? 0))}</div>
          </div>
        `
      })
      .join("")

    const html = `
<!doctype html>
<html lang="ar" dir="rtl">
  <head>
    <meta charset="utf-8" />
    <style>
      @font-face {
        font-family: "Cairo";
        src: url(data:font/ttf;base64,${fontBase64}) format("truetype");
        font-weight: normal;
        font-style: normal;
      }
      * { box-sizing: border-box; }
      body {
        font-family: "Cairo", Arial, sans-serif;
        margin: 40px;
        color: #111;
        font-size: 14px;
      }
      h1 { font-size: 20px; margin: 0 0 10px; }
      .section-title { margin: 18px 0 6px; font-weight: 700; }
      .label { color: #666; font-size: 12px; margin-top: 4px; }
      .value { font-size: 14px; }
      .items { display: grid; gap: 10px; }
      .item { border: 1px solid #f0f0f0; padding: 10px 12px; border-radius: 8px; }
      .item-name { font-weight: 700; margin-bottom: 4px; }
      .item-total { margin-bottom: 4px; }
      .item-meta { color: #444; font-size: 12px; }
      .totals { display: grid; gap: 6px; }
      .row { display: flex; justify-content: space-between; }
      .qr { margin-top: 16px; display: flex; justify-content: flex-start; }
      .qr img { width: 140px; height: 140px; }
    </style>
  </head>
  <body>
    <h1>${titleAr}</h1>

    ${inv.payment_link ? `
      <div class="label">رابط الدفع</div>
      <div class="value">${inv.payment_link}</div>
    ` : ""}

    <div class="section-title">العميل</div>
    <div class="value">${inv.customer_name || "-"}</div>
    <div class="label">الرقم الضريبي</div>
    <div class="value">${inv.customer_vat || "-"}</div>

    <div class="section-title">تفاصيل تقنية</div>
    <div class="totals">
      <div class="row"><span>الإجمالي قبل الضريبة</span><span>${formatSarAr(Number(inv.subtotal ?? 0))}</span></div>
      <div class="row"><span>ضريبة القيمة المضافة</span><span>${formatSarAr(Number(inv.vat_amount ?? 0))}</span></div>
      <div class="row"><strong>الإجمالي</strong><strong>${formatSarAr(Number(inv.total ?? 0))}</strong></div>
    </div>

    <div class="section-title">بنود الفاتورة</div>
    <div class="items">
      ${itemsHtml || `<div class="value">لا توجد بنود</div>`}
    </div>

    ${qrDataUrl ? `
      <div class="qr"><img src="${qrDataUrl}" alt="ZATCA QR"></div>
    ` : ""}
  </body>
</html>
    `

    const browser = await chromium.launch()
    const page = await browser.newPage()
    await page.setContent(html, { waitUntil: "networkidle" })
    const pdf = await page.pdf({ format: "A4", printBackground: true })
    await browser.close()

    return new Response(new Uint8Array(pdf), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="${inv.invoice_number}.pdf"`,
      },
    })
  } catch (err) {
    console.error("PDF ERROR:", err)
    return NextResponse.json({ error: "PDF generation failed" }, { status: 500 })
  }
}
