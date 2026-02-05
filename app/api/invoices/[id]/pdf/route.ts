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
      const levels = bidi.getEmbeddingLevels(reshaped, "rtl")
      const visual = bidi.getReorderedString(reshaped, levels)
      return Array.from(visual).reverse().join("")
    }

    const hasArabic = (text: string) => /[\u0600-\u06FF]/.test(text)
    const rightX = 545.28
    const drawRight = (text: string, size = 12, rtl = false) => {
      const content = rtl ? shapeArabic(text) : text
      const useFont = rtl ? cairoFont : font
      const width = useFont.widthOfTextAtSize(content, size)
      page.drawText(content, {
        x: rightX - width,
        y,
        size,
        font: useFont,
      })
      y -= size + 6
    }

    const formatSar = (amount: number) =>
      new Intl.NumberFormat("ar-SA", { style: "currency", currency: "SAR" }).format(amount)

    const titleAr =
      inv.invoice_type === "credit"
        ? "إشعار دائن"
        : inv.invoice_type === "debit"
        ? "إشعار مدين"
        : "فاتورة ضريبية"

    drawRight(titleAr, 18, true)
    y -= 10

    drawRight("البائع", 11, true)
    drawRight(String(inv.seller_name ?? "-"), 12, hasArabic(String(inv.seller_name ?? "")))
    drawRight("الرقم الضريبي", 11, true)
    drawRight(String(inv.seller_vat ?? "-"), 12, false)
    drawRight("السجل التجاري", 11, true)
    drawRight(String(inv.seller_cr ?? "-"), 12, false)
    y -= 10

    drawRight("رقم الفاتورة", 11, true)
    drawRight(String(inv.invoice_number), 12, false)
    drawRight("التاريخ", 11, true)
    drawRight(new Date(inv.issue_date).toLocaleString("ar-SA"), 12, true)
    if (inv.uuid) {
      drawRight("المعرّف (UUID)", 10, true)
      drawRight(String(inv.uuid), 10, false)
    }
    if (inv.invoice_hash) {
      drawRight("التجزئة", 9, true)
      drawRight(String(inv.invoice_hash), 8, false)
    }
    if (inv.original_invoice_id) {
      drawRight("الفاتورة الأصلية", 10, true)
      drawRight(String(inv.original_invoice_id), 10, false)
    }
    if (inv.note_reason) {
      drawRight("السبب", 10, true)
      drawRight(String(inv.note_reason), 10, hasArabic(String(inv.note_reason)))
    }
    y -= 10

    drawRight("العميل", 11, true)
    drawRight(String(inv.customer_name || "-"), 12, hasArabic(String(inv.customer_name || "")))
    drawRight("الرقم الضريبي", 11, true)
    drawRight(String(inv.customer_vat || "-"), 12, false)
    y -= 10

    drawRight("بنود الفاتورة", 13, true)
    y -= 4

    for (const it of itemsRes.rows) {
      const ratePct = ((Number(it.vat_rate) || 0) * 100).toFixed(0)
      const desc = String(it.description ?? "-")
      drawRight(desc, 12, hasArabic(desc))
      drawRight(
        `الكمية: ${Number(it.qty).toFixed(2)} × السعر: ${Number(it.unit_price).toFixed(2)}`,
        10,
        true
      )
      drawRight(`VAT: ${ratePct}% | ${formatSar(Number(it.vat_amount ?? 0))}`, 10, false)
      if (y < 160) break
    }

    y -= 10
    drawRight("الإجمالي قبل الضريبة", 11, true)
    drawRight(formatSar(Number(inv.subtotal)), 12, true)
    drawRight("ضريبة القيمة المضافة", 11, true)
    drawRight(formatSar(Number(inv.vat_amount)), 12, true)
    drawRight("الإجمالي", 12, true)
    drawRight(formatSar(Number(inv.total)), 14, true)
    if (inv.payment_link) {
      drawRight("رابط الدفع", 10, true)
      drawRight(String(inv.payment_link), 10, false)
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
