import PDFDocument from "pdfkit"
import { NextResponse } from "next/server"
import { pool } from "@/lib/db"
import { getCurrentUser } from "@/lib/current"
import { getBusinessByUserId } from "@/lib/business"
import { readFile } from "node:fs/promises"
import path from "node:path"

export const runtime = "nodejs"

function formatSar(amount: number) {
  return new Intl.NumberFormat("ar-SA", { style: "currency", currency: "SAR" }).format(amount)
}

export async function GET() {
  try {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const business = await getBusinessByUserId(user.userId)
    if (!business?.id) return NextResponse.json({ error: "Business not found" }, { status: 400 })

    const businessId = business.id
    const now = new Date()
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
    const last7 = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)

    const [totalsRes, monthRes, last7Res, statusRes, topCustomers] = await Promise.all([
      pool.query(
        `SELECT COUNT(*)::int AS invoices, COALESCE(SUM(total), 0) AS total, COALESCE(SUM(vat_amount), 0) AS vat
         FROM invoices WHERE business_id = $1`,
        [businessId]
      ),
      pool.query(
        `SELECT COUNT(*)::int AS invoices, COALESCE(SUM(total), 0) AS total, COALESCE(SUM(vat_amount), 0) AS vat
         FROM invoices WHERE business_id = $1 AND issue_date >= $2`,
        [businessId, monthStart]
      ),
      pool.query(
        `SELECT COUNT(*)::int AS invoices, COALESCE(SUM(total), 0) AS total, COALESCE(SUM(vat_amount), 0) AS vat
         FROM invoices WHERE business_id = $1 AND issue_date >= $2`,
        [businessId, last7]
      ),
      pool.query(
        `SELECT status, COUNT(*)::int AS count
         FROM invoices WHERE business_id = $1 GROUP BY status`,
        [businessId]
      ),
      pool.query(
        `SELECT customer_name, COALESCE(SUM(total), 0) AS total
         FROM invoices
         WHERE business_id = $1 AND customer_name IS NOT NULL
         GROUP BY customer_name
         ORDER BY total DESC
         LIMIT 5`,
        [businessId]
      ),
    ])

    const totals = totalsRes.rows[0]
    const month = monthRes.rows[0]
    const last = last7Res.rows[0]
    const statusMap = new Map<string, number>(statusRes.rows.map((r: any) => [r.status, r.count]))

    const doc = new PDFDocument({
      size: "A4",
      margin: 50,
      font: path.join(process.cwd(), "public", "fonts", "Cairo-Regular.ttf"),
    })
    const chunks: Buffer[] = []
    doc.on("data", (c) => chunks.push(c))
    const bufferPromise = new Promise<Buffer>((resolve) => {
      doc.on("end", () => resolve(Buffer.concat(chunks)))
    })

    const fontPath = path.join(process.cwd(), "public", "fonts", "Cairo-Regular.ttf")
    const fontBytes = await readFile(fontPath)
    doc.registerFont("Cairo", fontBytes)
    doc.font("Cairo")

    doc.font("Cairo")
    doc.fontSize(18).text("تقارير الفواتير", { align: "right" })
    doc.moveDown(0.5)
    doc.fontSize(10).text(`تاريخ التقرير: ${now.toISOString().slice(0, 10)}`, { align: "right" })
    doc.moveDown()

    doc.fontSize(14).text("ملخص عام", { align: "right" })
    doc.fontSize(11)
    doc.text(`الإجمالي الكلي: ${formatSar(Number(totals.total))}`, { align: "right" })
    doc.text(`ضريبة القيمة المضافة: ${formatSar(Number(totals.vat))}`, { align: "right" })
    doc.text(`عدد الفواتير: ${totals.invoices}`, { align: "right" })
    doc.moveDown()

    doc.fontSize(12).text("هذا الشهر", { align: "right" })
    doc.fontSize(11)
    doc.text(`الإجمالي: ${formatSar(Number(month.total))}`, { align: "right" })
    doc.text(`الضريبة: ${formatSar(Number(month.vat))}`, { align: "right" })
    doc.text(`عدد الفواتير: ${month.invoices}`, { align: "right" })
    doc.moveDown()

    doc.fontSize(12).text("آخر 7 أيام", { align: "right" })
    doc.fontSize(11)
    doc.text(`الإجمالي: ${formatSar(Number(last.total))}`, { align: "right" })
    doc.text(`الضريبة: ${formatSar(Number(last.vat))}`, { align: "right" })
    doc.text(`عدد الفواتير: ${last.invoices}`, { align: "right" })
    doc.moveDown()

    doc.fontSize(12).text("حالات الفواتير", { align: "right" })
    doc.fontSize(11)
    ;(["issued", "reported", "cleared", "rejected", "draft"] as const).forEach((s) => {
      doc.text(`${s}: ${statusMap.get(s) ?? 0}`, { align: "right" })
    })
    doc.moveDown()

    doc.fontSize(12).text("أفضل العملاء", { align: "right" })
    doc.fontSize(11)
    if (topCustomers.rows.length === 0) {
      doc.text("لا توجد بيانات", { align: "right" })
    } else {
      topCustomers.rows.forEach((c: any) => {
        doc.text(`${c.customer_name}: ${formatSar(Number(c.total))}`, { align: "right" })
      })
    }

    doc.end()
    const buffer = await bufferPromise

    return new Response(new Uint8Array(buffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": "attachment; filename=reports.pdf",
      },
    })
  } catch (err) {
    console.error("REPORT PDF ERROR:", err)
    return NextResponse.json({ error: "Report PDF failed" }, { status: 500 })
  }
}
