export const dynamic = "force-dynamic"
export const runtime = "nodejs"

import Link from "next/link"
import { redirect } from "next/navigation"
import { cookies } from "next/headers"
import { verifyToken } from "@/lib/auth"
import { getBusinessByUserId } from "@/lib/business"
import { pool } from "@/lib/db"

function formatSar(amount: number) {
  return new Intl.NumberFormat("ar-SA", { style: "currency", currency: "SAR" }).format(amount)
}
function formatDate(d: string) {
  return new Intl.DateTimeFormat("ar-SA", { dateStyle: "medium" }).format(new Date(d))
}

export default async function InvoicesPage() {
  const cookieStore = await cookies()
  const token = cookieStore.get("token")?.value
  const user = token ? verifyToken(token) : null
  if (!user) redirect("/login")

  const business = await getBusinessByUserId(user.userId)
  if (!business) return <div className="p-6">No business found for this user.</div>

  const res = await pool.query(
    `SELECT id, invoice_number, issue_date, total
     FROM invoices
     WHERE business_id = $1
     ORDER BY created_at DESC`,
    [business.id]
  )

  const invoices = res.rows as Array<{ id: string; invoice_number: string; issue_date: string; total: number }>

  return (
    <div dir="rtl" className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">الفواتير</h1>
          <p className="mt-1 text-sm text-gray-600">هذه الفواتير خاصة بمنشأتك فقط.</p>
        </div>

        <Link
          href="/dashboard/invoices/new"
          className="inline-flex items-center rounded-lg bg-black px-4 py-2 text-sm font-medium text-white hover:opacity-90"
        >
          + فاتورة جديدة
        </Link>
      </div>

      {invoices.length === 0 ? (
        <div className="rounded-xl border bg-white p-8 text-center text-gray-600">لا توجد فواتير حالياً.</div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {invoices.map((inv) => (
            <div key={inv.id} className="rounded-xl border bg-white p-4 shadow-sm">
              <div className="text-sm text-gray-500">رقم الفاتورة</div>
              <div className="text-lg font-semibold">{inv.invoice_number}</div>

              <div className="mt-3 flex items-center justify-between text-sm">
                <span className="text-gray-500">التاريخ</span>
                <span className="font-medium text-gray-900">{formatDate(inv.issue_date)}</span>
              </div>

              <div className="mt-2 flex items-center justify-between text-sm">
                <span className="text-gray-500">الإجمالي</span>
                <span className="font-semibold text-gray-900">{formatSar(inv.total)}</span>
              </div>

              <div className="mt-4 flex gap-2">
                <Link
                  href={`/dashboard/invoices/${inv.id}`} // ✅ UUID in URL
                  className="flex-1 rounded-lg border px-3 py-2 text-center text-xs font-medium hover:bg-gray-50"
                >
                  عرض التفاصيل
                </Link>

                <a
                  href={`/api/invoices/${inv.id}/pdf`} // ✅ No DB column needed
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-lg border px-3 py-2 text-xs font-medium hover:bg-gray-50"
                >
                  PDF
                </a>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
