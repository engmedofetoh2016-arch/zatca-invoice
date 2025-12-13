export const runtime = "nodejs"
export const dynamic = "force-dynamic"

import fontkit from "@pdf-lib/fontkit"
import { readFile } from "node:fs/promises"
import path from "node:path"
import { NextResponse } from "next/server"
import { PDFDocument, StandardFonts } from "pdf-lib"
import { pool } from "@/lib/db"
import { zatcaQrDataUrl } from "@/lib/zatca"
import { getCurrentUser, getCurrentBusinessId } from "@/lib/current"

function b64ToUint8Array(base64: string) {
  const bin = Buffer.from(base64, "base64")
  return new Uint8Array(bin)
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    // AUTH
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const businessId = await getCurrentBusinessId(user.userId)
    if (!businessId) return NextResponse.json({ error: "Business not found" }, { status: 400 })

    // FETCH INVOICE
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
      `SELECT description, qty, unit_price, line_total FROM invoice_items WHERE invoice_id = $1 ORDER BY id`,
      [id]
    )

    // ZATCA QR
    const qrDataUrl = await zatcaQrDataUrl({
      sellerName: inv.seller_name,
      vatNumber: inv.seller_vat,
      timestampISO: new Date(inv.issue_date).toISOString(),
      total: Number(inv.total).toFixed(2),
      vatAmount: Number(inv.vat_amount).toFixed(2),
    })
    const qrBytes = b64ToUint8Array(qrDataUrl.split(",")[1])

    // BUILD PDF
    const pdfDoc = await PDFDocument.create()

    // ✅ create page first
    const page = pdfDoc.addPage([595.28, 841.89]) // A4

    // ✅ embed latin font
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica)

    // ✅ register fontkit + embed arabic font
    pdfDoc.registerFontkit(fontkit)
    const fontPath = path.join(process.cwd(), "public", "fonts", "Cairo-Regular.ttf")
    const fontBytes = await readFile(fontPath)
    const cairoFont = await pdfDoc.embedFont(fontBytes)

    // ✅ embed QR image
    const qrImage = await pdfDoc.embedPng(qrBytes)

    let y = 800
    const left = 50

    const draw = (text: string, size = 12, useArabic = false) => {
      page.drawText(text, {
        x: left,
        y,
        size,
        font: useArabic ? cairoFont : font,
      })
      y -= size + 6
    }

    // Title (English + Arabic separately to avoid encoding issues)
    draw("Tax Invoice", 16, false)
    draw("فاتورة ضريبية", 16, true)
    y -= 10

    draw(`Seller: ${inv.seller_name}`, 12, false)
    draw(`VAT: ${inv.seller_vat}`, 12, false)
    draw(`CR: ${inv.seller_cr}`, 12, false)
    y -= 10

    draw(`Invoice No: ${inv.invoice_number}`, 12, false)
    draw(`Date: ${new Date(inv.issue_date).toLocaleString()}`, 12, false)
    y -= 10

    draw(`Customer: ${inv.customer_name || "-"}`, 12, false)
    draw(`Customer VAT: ${inv.customer_vat || "-"}`, 12, false)
    y -= 10

    draw("Items:", 13, false)
    y -= 4

    for (const it of itemsRes.rows) {
      draw(
        `- ${it.description} | qty: ${it.qty} | unit: ${it.unit_price} | total: ${it.line_total}`,
        11,
        false
      )
      if (y < 160) break
    }

    y -= 10
    draw(`Subtotal: ${Number(inv.subtotal).toFixed(2)} SAR`, 12, false)
    draw(`VAT (15%): ${Number(inv.vat_amount).toFixed(2)} SAR`, 12, false)
    draw(`TOTAL: ${Number(inv.total).toFixed(2)} SAR`, 14, false)

    // QR bottom-right
    page.drawImage(qrImage, { x: 595.28 - 50 - 140, y: 60, width: 140, height: 140 })
    page.drawText("ZATCA QR", { x: 595.28 - 50 - 140, y: 45, size: 10, font })

    const pdfBytes = await pdfDoc.save()

    return new Response(pdfBytes, {
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
