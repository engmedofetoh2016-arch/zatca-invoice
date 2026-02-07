export const dynamic = "force-dynamic"
export const runtime = "nodejs"

import Link from "next/link"
import { redirect } from "next/navigation"
import { cookies } from "next/headers"
import { verifyToken } from "@/lib/auth"
import { getBusinessByUserId } from "@/lib/business"
import { pool } from "@/lib/db"
import InvoiceImportExport from "./InvoiceImportExport"
import FiltersClient from "./FiltersClient"

function formatSar(amount: number) {
  return new Intl.NumberFormat("ar-SA", { style: "currency", currency: "SAR" }).format(amount)
}
function formatDate(d: string) {
  return new Intl.DateTimeFormat("ar-SA", { dateStyle: "medium" }).format(new Date(d))
}

function statusLabel(status: string) {
  switch (status) {
    case "draft":
      return "مسودة"
    case "issued":
      return "صادرة"
    case "reported":
      return "مبلّغ عنها"
    case "cleared":
      return "مصفّاة"
    case "rejected":
      return "مرفوضة"
    default:
      return status
  }
}

function statusClass(status: string) {
  switch (status) {
    case "draft":
      return "bg-gray-100 text-gray-700"
    case "issued":
      return "bg-blue-100 text-blue-700"
    case "reported":
      return "bg-yellow-100 text-yellow-700"
    case "cleared":
      return "bg-green-100 text-green-700"
    case "rejected":
      return "bg-red-100 text-red-700"
    default:
      return "bg-gray-100 text-gray-700"
  }
}

function typeLabel(type: string) {
  switch (type) {
    case "credit":
      return "إشعار دائن"
    case "debit":
      return "إشعار مدين"
    default:
      return "فاتورة"
  }
}

function typeClass(type: string) {
  switch (type) {
    case "credit":
      return "bg-purple-100 text-purple-700"
    case "debit":
      return "bg-orange-100 text-orange-700"
    default:
      return "bg-slate-100 text-slate-700"
  }
}

export default async function InvoicesPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; date?: string; type?: string; from?: string; to?: string; page?: string; q?: string }>
}) {
  const sp = await searchParams
  const cookieStore = await cookies()
  const token = cookieStore.get("token")?.value
  const user = token ? verifyToken(token) : null
  if (!user) redirect("/login")

  const business = await getBusinessByUserId(user.userId)
  if (!business) return <div className="p-6">No business found for this user.</div>

  const status = sp.status ?? "all"
  const type = sp.type ?? "all"
  const date = sp.date ?? "all"
  const from = sp.from ?? ""
  const to = sp.to ?? ""
  const q = sp.q ?? ""
  const page = Math.max(1, Number(sp.page ?? 1) || 1)
  const pageSize = 12

  const conditions: string[] = ["business_id = $1"]
  const values: Array<string | number | Date> = [business.id]

  if (status !== "all") {
    values.push(status)
    conditions.push(`status = $${values.length}`)
  }

  if (type !== "all") {
    values.push(type)
    conditions.push(`invoice_type = $${values.length}`)
  }

  if (q) {
    values.push(`%${q}%`)
    conditions.push(`(invoice_number ILIKE $${values.length} OR customer_name ILIKE $${values.length})`)
  }

  const now = new Date()
  if (date === "month") {
    const start = new Date(now.getFullYear(), now.getMonth(), 1)
    values.push(start)
    conditions.push(`issue_date >= $${values.length}`)
  } else if (date === "last7") {
    const start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    values.push(start)
    conditions.push(`issue_date >= $${values.length}`)
  } else if (date === "custom") {
    if (from) {
      values.push(new Date(from))
      conditions.push(`issue_date >= $${values.length}`)
    }
    if (to) {
      values.push(new Date(to))
      conditions.push(`issue_date <= $${values.length}`)
    }
  }

  const whereSql = conditions.length ? `WHERE ${conditions.join(" AND ")}` : ""

  const countRes = await pool.query(
    `SELECT COUNT(*)::int AS count
     FROM invoices
     ${whereSql}`,
    values
  )
  const totalCount = Number(countRes.rows[0]?.count ?? 0)
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize))
  const safePage = Math.min(page, totalPages)
  const pageWindow = 5
  const startPage = Math.max(1, safePage - Math.floor(pageWindow / 2))
  const endPage = Math.min(totalPages, startPage + pageWindow - 1)

  const res = await pool.query(
    `SELECT id, invoice_number, issue_date, total, status, invoice_type, customer_name
     FROM invoices
     ${whereSql}
     ORDER BY created_at DESC
     LIMIT $${values.length + 1} OFFSET $${values.length + 2}`,
    [...values, pageSize, (safePage - 1) * pageSize]
  )

  const invoices = res.rows as Array<{ id: string; invoice_number: string; issue_date: string; total: number; status: string; invoice_type: string; customer_name?: string }>

  return (
    <div dir="rtl" className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="text-xs text-gray-500">إدارة الفواتير</div>
          <h1 className="mt-2 text-2xl font-semibold text-gray-900">الفواتير</h1>
          <p className="mt-1 text-sm text-gray-600">هذه الفواتير خاصة بمنشأتك فقط.</p>
        </div>

        <div className="flex flex-col gap-3 items-start sm:items-end">
          <Link
            href="/dashboard/invoices/new"
            className="inline-flex items-center rounded-lg bg-black px-4 py-2 text-sm font-semibold text-white hover:opacity-90"
          >
            + فاتورة جديدة
          </Link>
          <InvoiceImportExport />
        </div>
      </div>

      <div className="rounded-2xl border bg-white p-4 shadow-sm">
        <FiltersClient />
      </div>

      {invoices.length === 0 ? (
        <div className="rounded-2xl border bg-white p-10 text-center text-gray-600">
          لا توجد فواتير حالياً.
        </div>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {invoices.map((inv) => (
              <div key={inv.id} className="relative rounded-2xl border bg-white p-5 shadow-sm">
                <div className="absolute left-5 top-4">
                  <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${statusClass(inv.status)}`}>
                    {statusLabel(inv.status)}
                  </span>
                </div>

                <div className="mt-6 text-xs text-gray-500">رقم الفاتورة</div>
                <div className="mt-1 text-xl font-semibold">{inv.invoice_number}</div>

                {inv.customer_name && (
                  <div className="mt-2 text-sm text-gray-600">العميل: <span className="font-semibold text-gray-800">{inv.customer_name}</span></div>
                )}

                <div className="mt-4 grid gap-2 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-500">التاريخ</span>
                    <span className="font-medium text-gray-900">{formatDate(inv.issue_date)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-500">الإجمالي</span>
                    <span className="font-semibold text-gray-900">{formatSar(inv.total)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-500">النوع</span>
                    <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${typeClass(inv.invoice_type)}`}>
                      {typeLabel(inv.invoice_type)}
                    </span>
                  </div>
                </div>

                <div className="mt-5 flex gap-2">
                  <Link
                    href={`/dashboard/invoices/${inv.id}`}
                    className="flex-1 rounded-lg border px-3 py-2 text-center text-xs font-semibold hover:bg-gray-50"
                  >
                    عرض التفاصيل
                  </Link>

                  <a
                    href={`/api/invoices/${inv.id}/pdf`}
                    target="_blank"
                    rel="noreferrer"
                    className="rounded-lg border px-3 py-2 text-xs font-semibold hover:bg-gray-50"
                  >
                    PDF
                  </a>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-6 flex flex-wrap items-center justify-between gap-3 text-xs text-gray-600">
            <div>
              الصفحة {safePage} من {totalPages} — إجمالي {totalCount}
            </div>
            <div className="flex items-center gap-2">
              <Link
                href={`/dashboard/invoices?status=${status}&date=${date}&type=${type}&from=${from}&to=${to}&q=${encodeURIComponent(q)}&page=${Math.max(1, safePage - 1)}`}
                className={`rounded-lg border px-3 py-2 text-xs font-semibold ${safePage === 1 ? "pointer-events-none opacity-50" : "hover:bg-gray-50"}`}
              >
                السابق
              </Link>
              {Array.from({ length: endPage - startPage + 1 }, (_, i) => startPage + i).map((p) => (
                <Link
                  key={p}
                  href={`/dashboard/invoices?status=${status}&date=${date}&type=${type}&from=${from}&to=${to}&q=${encodeURIComponent(q)}&page=${p}`}
                  className={`rounded-lg border px-3 py-2 text-xs font-semibold ${p === safePage ? "bg-black text-white" : "hover:bg-gray-50"}`}
                >
                  {p}
                </Link>
              ))}
              <Link
                href={`/dashboard/invoices?status=${status}&date=${date}&type=${type}&from=${from}&to=${to}&q=${encodeURIComponent(q)}&page=${Math.min(totalPages, safePage + 1)}`}
                className={`rounded-lg border px-3 py-2 text-xs font-semibold ${safePage >= totalPages ? "pointer-events-none opacity-50" : "hover:bg-gray-50"}`}
              >
                التالي
              </Link>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
