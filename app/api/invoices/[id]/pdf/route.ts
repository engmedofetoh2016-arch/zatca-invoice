export const runtime = "nodejs"
export const dynamic = "force-dynamic"

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

    let y = 800
    const left = 50
    const rightX = 545.28
    const maxWidth = rightX - left

    const sanitize = (text: string) => {
      const raw = String(text ?? "")
      const ascii = raw.replace(/[^\x20-\x7E]/g, "")
      const trimmed = ascii.trim()
      return trimmed.length > 0 ? trimmed : "-"
    }

    const measure = (text: string, size: number) => font.widthOfTextAtSize(sanitize(text), size)

    const wrapText = (text: string, size: number, width: number) => {
      const words = sanitize(text).split(/\s+/).filter(Boolean)
      if (words.length === 0) return [""]
      const lines: string[] = []
      let line = ""
      for (const w of words) {
        const next = line ? `${line} ${w}` : w
        if (measure(next, size) <= width) {
          line = next
        } else {
          if (line) lines.push(line)
          line = w
        }
      }
      if (line) lines.push(line)
      return lines
    }

    const drawLeftLine = (text: string, size = 12, xLeft = left) => {
      page.drawText(sanitize(text), { x: xLeft, y, size, font })
    }

    const drawLeft = (text: string, size = 12, gap = 6) => {
      drawLeftLine(text, size, left)
      y -= size + gap
    }

    const drawLeftWrapped = (text: string, size = 12, gap = 6) => {
      const lines = wrapText(text, size, maxWidth)
      for (const line of lines) {
        drawLeftLine(line, size, left)
        y -= size + gap
      }
    }

    const formatSar = (amount: number) =>
      new Intl.NumberFormat("en-US", { style: "currency", currency: "SAR" }).format(amount)

    const titleEn =
      inv.invoice_type === "credit"
        ? "Credit Note"
        : inv.invoice_type === "debit"
        ? "Debit Note"
        : "Tax Invoice"

    drawLeft(titleEn, 16, 4)
    y -= 6

    const labelSize = 9
    const valueSize = 10
    const labelGap = 2
    const valueGap = 4

    drawLeft("Seller", labelSize, labelGap)
    drawLeftWrapped(String(inv.seller_name ?? "-"), valueSize, valueGap)
    drawLeft("VAT Number", labelSize, labelGap)
    drawLeft(String(inv.seller_vat ?? "-"), valueSize, valueGap)
    drawLeft("CR Number", labelSize, labelGap)
    drawLeft(String(inv.seller_cr ?? "-"), valueSize, valueGap)
    y -= 6

    drawLeft("Invoice Number", labelSize, labelGap)
    drawLeft(String(inv.invoice_number), valueSize, valueGap)
    drawLeft("Date", labelSize, labelGap)
    drawLeft(new Date(inv.issue_date).toLocaleString("en-US"), valueSize, valueGap)
    if (inv.uuid) {
      drawLeft("UUID", labelSize, labelGap)
      drawLeftWrapped(String(inv.uuid), valueSize, valueGap)
    }
    if (inv.invoice_hash) {
      drawLeft("Hash", labelSize, labelGap)
      drawLeftWrapped(String(inv.invoice_hash), valueSize - 1, valueGap)
    }
    if (inv.original_invoice_id) {
      drawLeft("Original Invoice", labelSize, labelGap)
      drawLeftWrapped(String(inv.original_invoice_id), valueSize, valueGap)
    }
    if (inv.note_reason) {
      drawLeft("Reason", labelSize, labelGap)
      drawLeft(String(inv.note_reason), valueSize, valueGap)
    }
    y -= 6

    drawLeft("Customer", labelSize, labelGap)
    drawLeftWrapped(String(inv.customer_name || "-"), valueSize, valueGap)
    drawLeft("Customer VAT", labelSize, labelGap)
    drawLeft(String(inv.customer_vat || "-"), valueSize, valueGap)
    y -= 8

    drawLeft("Invoice Items", 13)
    y -= 6

    const tableLeft = left
    const tableRight = rightX
    const colVat = 70
    const colTotal = 90
    const colUnit = 80
    const colQty = 60
    const colItem = tableRight - tableLeft - (colVat + colTotal + colUnit + colQty)

    const colLeftItem = tableLeft
    const colLeftQty = colLeftItem + colItem
    const colLeftUnit = colLeftQty + colQty
    const colLeftTotal = colLeftUnit + colUnit
    const colLeftVat = colLeftTotal + colTotal

    const drawCellLeft = (text: string, size: number, colLeft: number) => {
      page.drawText(sanitize(text), { x: colLeft, y, size, font })
    }

    // header
    drawCellLeft("Item", 11, colLeftItem)
    drawCellLeft("Qty", 11, colLeftQty)
    drawCellLeft("Unit", 11, colLeftUnit)
    drawCellLeft("Total", 11, colLeftTotal)
    drawCellLeft("VAT", 11, colLeftVat)
    y -= 16

    for (const it of itemsRes.rows) {
      const ratePct = ((Number(it.vat_rate) || 0) * 100).toFixed(0)
      const desc = String(it.description ?? "-")
      const descLines = wrapText(desc, 11, colItem)

      // description (may wrap)
      for (let i = 0; i < descLines.length; i++) {
        const line = descLines[i]
        drawCellLeft(line, 11, colLeftItem)
        if (i < descLines.length - 1) {
          y -= 14
        }
      }

      // other columns on first line
      const qtyText = Number(it.qty ?? 0).toFixed(2)
      const unitText = Number(it.unit_price ?? 0).toFixed(2)
      const totalText = Number(it.line_total ?? 0).toFixed(2)
      const vatText = `${ratePct}%`

      drawCellLeft(qtyText, 11, colLeftQty)
      drawCellLeft(unitText, 11, colLeftUnit)
      drawCellLeft(totalText, 11, colLeftTotal)
      drawCellLeft(vatText, 11, colLeftVat)

      y -= 16
      if (y < 160) break
    }

    y -= 10
    drawLeft("Subtotal", 11)
    drawLeft(formatSar(Number(inv.subtotal)), 12)
    drawLeft("VAT", 11)
    drawLeft(formatSar(Number(inv.vat_amount)), 12)
    drawLeft("Total", 12)
    drawLeft(formatSar(Number(inv.total)), 14)
    if (inv.payment_link) {
      drawLeft("Payment Link", 10)
      drawLeft(String(inv.payment_link), 10)
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
