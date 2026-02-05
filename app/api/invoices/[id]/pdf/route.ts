export const runtime = "nodejs"
export const dynamic = "force-dynamic"

import fontkit from "@pdf-lib/fontkit"
import arabicReshaper from "arabic-reshaper"
import bidiFactory from "bidi-js"
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

const bidi = bidiFactory()

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
      `SELECT description, qty, unit_price, line_total, vat_rate, vat_amount, vat_exempt_reason FROM invoice_items WHERE invoice_id = $1 ORDER BY id`,
      [id]
    )

    const pdfDoc = await PDFDocument.create()

    let qrImage: any = null
    try {
      const issueDate = new Date(inv.issue_date)
      const timestampISO = Number.isNaN(issueDate.getTime())
        ? new Date().toISOString()
        : issueDate.toISOString()
      const qrDataUrl = await zatcaQrDataUrl({
        sellerName: String(inv.seller_name ?? ""),
        vatNumber: String(inv.seller_vat ?? ""),
        timestampISO,
        total: Number(inv.total ?? 0).toFixed(2),
        vatAmount: Number(inv.vat_amount ?? 0).toFixed(2),
      })
      const qrPart = qrDataUrl.split(",")[1]
      if (qrPart) {
        const qrBytes = b64ToUint8Array(qrPart)
        qrImage = await pdfDoc.embedPng(qrBytes)
      }
    } catch (e) {
      console.error("QR ERROR:", e)
    }

    const page = pdfDoc.addPage([595.28, 841.89])

    const font = await pdfDoc.embedFont(StandardFonts.Helvetica)

    pdfDoc.registerFontkit(fontkit)
    const fontPath = path.join(process.cwd(), "public", "fonts", "Cairo-Regular.ttf")
    const fontBytes = await readFile(fontPath)
    const cairoFont = await pdfDoc.embedFont(fontBytes)


    let y = 800
    const left = 50

    function shapeArabic(text: string) {
      const reshaped = arabicReshaper.convertArabic(text)
      const levels = bidi.getEmbeddingLevels(reshaped, "ltr")
      return bidi.getReorderedString(reshaped, levels)
    }

    const hasArabic = (text: string) => /[\u0600-\u06FF]/.test(text)
    const draw = (text: string, size = 12, useArabic = false) => {
      const useAr = useArabic || hasArabic(text)
      const content = useAr ? shapeArabic(text) : text
      page.drawText(content, {
        x: left,
        y,
        size,
        font: useAr ? cairoFont : font,
      })
      y -= size + 6
    }

    const drawArabicRight = (text: string, size = 12, rightX = 545.28) => {
      const shaped = shapeArabic(text)
      const width = cairoFont.widthOfTextAtSize(shaped, size)
      page.drawText(shaped, {
        x: rightX - width,
        y,
        size,
        font: cairoFont,
      })
      y -= size + 6
    }

    const titleAr = inv.invoice_type === "credit" ? "إشعار دائن" : inv.invoice_type === "debit" ? "إشعار مدين" : "فاتورة ضريبية"

    drawArabicRight(titleAr, 18)
    y -= 10

    drawArabicRight(`البائع: ${inv.seller_name ?? "-"}`, 12)
    drawArabicRight(`الرقم الضريبي: ${inv.seller_vat ?? "-"}`, 12)
    drawArabicRight(`السجل التجاري: ${inv.seller_cr ?? "-"}`, 12)
    y -= 10

    drawArabicRight(`رقم الفاتورة: ${inv.invoice_number}`, 12)
    drawArabicRight(`التاريخ: ${new Date(inv.issue_date).toLocaleString("ar-SA")}`, 12)
    if (inv.uuid) {
      drawArabicRight(`المعرّف (UUID): ${inv.uuid}`, 10)
    }
    if (inv.invoice_hash) {
      drawArabicRight(`التجزئة: ${inv.invoice_hash}`, 8)
    }
    if (inv.original_invoice_id) {
      drawArabicRight(`الفاتورة الأصلية: ${inv.original_invoice_id}`, 10)
    }
    if (inv.note_reason) {
      drawArabicRight(`السبب: ${inv.note_reason}`, 10)
    }
    y -= 10

    drawArabicRight(`العميل: ${inv.customer_name || "-"}`, 12)
    drawArabicRight(`رقم ضريبة العميل: ${inv.customer_vat || "-"}`, 12)
    y -= 10

    drawArabicRight("بنود الفاتورة:", 13)
    y -= 4

    for (const it of itemsRes.rows) {
      const ratePct = ((Number(it.vat_rate) || 0) * 100).toFixed(0)
      drawArabicRight(
        `- ${it.description} | الكمية: ${it.qty} | السعر: ${it.unit_price} | الإجمالي: ${it.line_total} | الضريبة: ${ratePct}%`,
        11
      )
      if (y < 160) break
    }

    y -= 10
    drawArabicRight(`الإجمالي قبل الضريبة: ${Number(inv.subtotal).toFixed(2)} ر.س`, 12)
    drawArabicRight(`الضريبة (15%): ${Number(inv.vat_amount).toFixed(2)} ر.س`, 12)
    drawArabicRight(`الإجمالي: ${Number(inv.total).toFixed(2)} ر.س`, 14)
    if (inv.payment_link) {
      drawArabicRight(`رابط الدفع: ${inv.payment_link}`, 10)
    }

    if (qrImage) {
      page.drawImage(qrImage, { x: 595.28 - 50 - 140, y: 60, width: 140, height: 140 })
      page.drawText("ZATCA QR", { x: 595.28 - 50 - 140, y: 45, size: 10, font })
    }

    const pdfBytes = await pdfDoc.save()

    return new Response(Buffer.from(pdfBytes), {
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
