export const runtime = "nodejs"
export const dynamic = "force-dynamic"

import path from "node:path"
import { readFile } from "node:fs/promises"
import { NextResponse } from "next/server"
import { chromium } from "playwright"
import { pool } from "@/lib/db"
import { getCurrentUser } from "@/lib/current"
import { getBusinessByUserId } from "@/lib/business"

function formatSarAr(amount: number) {
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

    const fontPath = path.join(process.cwd(), "public", "fonts", "Cairo-Regular.ttf")
    const fontBase64 = (await readFile(fontPath)).toString("base64")

    const formatDate = (d: Date) => d.toISOString().slice(0, 10)

    const statusRows = ["issued", "reported", "cleared", "rejected", "draft"]
      .map((s) => `<div class="row"><span>${s}</span><span>${statusMap.get(s) ?? 0}</span></div>`)
      .join("")

    const topRows =
      topCustomers.rows.length === 0
        ? `<div class="row"><span>لا توجد بيانات</span><span>-</span></div>`
        : topCustomers.rows
            .map(
              (c: any) =>
                `<div class="row"><span>${c.customer_name}</span><span>${formatSarAr(Number(c.total))}</span></div>`
            )
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
      h1 { font-size: 20px; margin: 0 0 6px; }
      .muted { color: #555; font-size: 12px; }
      .section { margin-top: 16px; }
      .section-title { font-weight: 700; margin-bottom: 6px; }
      .card { border: 1px solid #eee; border-radius: 8px; padding: 10px 12px; }
      .row { display: flex; justify-content: space-between; padding: 2px 0; }
    </style>
  </head>
  <body>
    <h1>تقارير الفواتير</h1>
    <div class="muted">تاريخ التقرير: ${formatDate(now)}</div>

    <div class="section">
      <div class="section-title">ملخص عام</div>
      <div class="card">
        <div class="row"><span>الإجمالي الكلي</span><span>${formatSarAr(Number(totals.total))}</span></div>
        <div class="row"><span>ضريبة القيمة المضافة</span><span>${formatSarAr(Number(totals.vat))}</span></div>
        <div class="row"><span>عدد الفواتير</span><span>${totals.invoices}</span></div>
      </div>
    </div>

    <div class="section">
      <div class="section-title">هذا الشهر</div>
      <div class="card">
        <div class="row"><span>الإجمالي</span><span>${formatSarAr(Number(month.total))}</span></div>
        <div class="row"><span>الضريبة</span><span>${formatSarAr(Number(month.vat))}</span></div>
        <div class="row"><span>عدد الفواتير</span><span>${month.invoices}</span></div>
      </div>
    </div>

    <div class="section">
      <div class="section-title">آخر 7 أيام</div>
      <div class="card">
        <div class="row"><span>الإجمالي</span><span>${formatSarAr(Number(last.total))}</span></div>
        <div class="row"><span>الضريبة</span><span>${formatSarAr(Number(last.vat))}</span></div>
        <div class="row"><span>عدد الفواتير</span><span>${last.invoices}</span></div>
      </div>
    </div>

    <div class="section">
      <div class="section-title">حالات الفواتير</div>
      <div class="card">
        ${statusRows}
      </div>
    </div>

    <div class="section">
      <div class="section-title">أفضل العملاء</div>
      <div class="card">
        ${topRows}
      </div>
    </div>
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
        "Content-Disposition": "attachment; filename=reports.pdf",
      },
    })
  } catch (err) {
    console.error("REPORT PDF ERROR:", err)
    return NextResponse.json({ error: "Report PDF failed" }, { status: 500 })
  }
}
