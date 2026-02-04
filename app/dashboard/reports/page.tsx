import { pool } from "@/lib/db"
import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { verifyToken } from "@/lib/auth"
import { getBusinessByUserId } from "@/lib/business"

export const dynamic = "force-dynamic"

function formatSar(amount: number) {
  return new Intl.NumberFormat("ar-SA", { style: "currency", currency: "SAR" }).format(amount)
}

export default async function ReportsPage() {
  const cookieStore = await cookies()
  const token = cookieStore.get("token")?.value
  const user = token ? verifyToken(token) : null
  if (!user) redirect("/login")

  const business = await getBusinessByUserId(user.userId)
  if (!business) return <div className="p-6">No business found for this user.</div>

  const businessId = business.id
  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
  const last7 = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)

  const totalsRes = await pool.query(
    `SELECT
       COUNT(*)::int AS invoices,
       COALESCE(SUM(total), 0) AS total,
       COALESCE(SUM(vat_amount), 0) AS vat
     FROM invoices
     WHERE business_id = $1`,
    [businessId]
  )

  const monthRes = await pool.query(
    `SELECT
       COUNT(*)::int AS invoices,
       COALESCE(SUM(total), 0) AS total,
       COALESCE(SUM(vat_amount), 0) AS vat
     FROM invoices
     WHERE business_id = $1 AND issue_date >= $2`,
    [businessId, monthStart]
  )

  const last7Res = await pool.query(
    `SELECT
       COUNT(*)::int AS invoices,
       COALESCE(SUM(total), 0) AS total,
       COALESCE(SUM(vat_amount), 0) AS vat
     FROM invoices
     WHERE business_id = $1 AND issue_date >= $2`,
    [businessId, last7]
  )

  const statusRes = await pool.query(
    `SELECT status, COUNT(*)::int AS count
     FROM invoices
     WHERE business_id = $1
     GROUP BY status`,
    [businessId]
  )

  const topCustomers = await pool.query(
    `SELECT customer_name, COALESCE(SUM(total), 0) AS total
     FROM invoices
     WHERE business_id = $1 AND customer_name IS NOT NULL
     GROUP BY customer_name
     ORDER BY total DESC
     LIMIT 5`,
    [businessId]
  )

  const totals = totalsRes.rows[0]
  const month = monthRes.rows[0]
  const last = last7Res.rows[0]
  const statusMap = new Map<string, number>(statusRes.rows.map((r: any) => [r.status, r.count]))

  return (
    <div dir="rtl" className="space-y-6">
      <div>
        <div className="text-xs text-gray-500">لوحة التقارير</div>
        <h1 className="mt-2 text-2xl font-semibold">الملخصات</h1>
        <p className="mt-1 text-sm text-gray-600">نظرة سريعة على أداء الفواتير.</p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <a
          href="/api/reports/export/pdf"
          className="rounded-lg border px-3 py-2 text-xs font-semibold hover:bg-gray-50"
        >
          تصدير PDF
        </a>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-2xl border bg-white p-5 shadow-sm">
          <div className="text-xs text-gray-500">الإجمالي الكلي</div>
          <div className="mt-2 text-xl font-semibold">{formatSar(Number(totals.total))}</div>
          <div className="mt-1 text-xs text-gray-500">ضريبة: {formatSar(Number(totals.vat))}</div>
          <div className="mt-1 text-xs text-gray-500">عدد الفواتير: {totals.invoices}</div>
        </div>
        <div className="rounded-2xl border bg-white p-5 shadow-sm">
          <div className="text-xs text-gray-500">هذا الشهر</div>
          <div className="mt-2 text-xl font-semibold">{formatSar(Number(month.total))}</div>
          <div className="mt-1 text-xs text-gray-500">ضريبة: {formatSar(Number(month.vat))}</div>
          <div className="mt-1 text-xs text-gray-500">عدد الفواتير: {month.invoices}</div>
        </div>
        <div className="rounded-2xl border bg-white p-5 shadow-sm">
          <div className="text-xs text-gray-500">آخر 7 أيام</div>
          <div className="mt-2 text-xl font-semibold">{formatSar(Number(last.total))}</div>
          <div className="mt-1 text-xs text-gray-500">ضريبة: {formatSar(Number(last.vat))}</div>
          <div className="mt-1 text-xs text-gray-500">عدد الفواتير: {last.invoices}</div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-2xl border bg-white p-5 shadow-sm">
          <div className="text-sm font-semibold">حالة الفواتير</div>
          <div className="mt-3 space-y-2 text-sm">
            {(["issued", "reported", "cleared", "rejected", "draft"] as const).map((s) => (
              <div key={s} className="flex items-center justify-between">
                <span className="text-gray-600">{s}</span>
                <span className="font-semibold">{statusMap.get(s) ?? 0}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border bg-white p-5 shadow-sm">
          <div className="text-sm font-semibold">أفضل العملاء</div>
          {topCustomers.rows.length === 0 ? (
            <div className="mt-3 text-sm text-gray-500">لا توجد بيانات</div>
          ) : (
            <div className="mt-3 space-y-2 text-sm">
              {topCustomers.rows.map((c: any) => (
                <div key={c.customer_name} className="flex items-center justify-between">
                  <span className="text-gray-700">{c.customer_name}</span>
                  <span className="font-semibold">{formatSar(Number(c.total))}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
