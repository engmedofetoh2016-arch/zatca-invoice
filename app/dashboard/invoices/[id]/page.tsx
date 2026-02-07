export const dynamic = "force-dynamic"
export const runtime = "nodejs"

import Link from "next/link"
import { redirect } from "next/navigation"
import { cookies } from "next/headers"
import { verifyToken } from "@/lib/auth"
import { getBusinessByUserId } from "@/lib/business"
import { pool } from "@/lib/db"
import InvoiceStatusActions from "../InvoiceStatusActions"
import LinkPayment from "./LinkPayment"

function formatSar(amount: number) {
  return new Intl.NumberFormat("ar-SA", { style: "currency", currency: "SAR" }).format(amount)
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

export default async function InvoicePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  const cookieStore = await cookies()
  const token = cookieStore.get("token")?.value
  const user = token ? verifyToken(token) : null
  if (!user) redirect("/login")

  const business = await getBusinessByUserId(user.userId)
  if (!business) return <div className="p-6">No business found for this user.</div>

  const businessId =
    (business as any).id ??
    (business as any).business_id ??
    (business as any).businessId

  if (!businessId) {
    return (
      <div className="p-6 space-y-2">
        <div className="font-semibold">Business id is missing</div>
        <pre className="text-xs border p-2 overflow-auto">
          {JSON.stringify(business, null, 2)}
        </pre>
        <Link className="underline" href="/dashboard">Back</Link>
      </div>
    )
  }

  const invRes = await pool.query(
    `SELECT id, invoice_number, issue_date, customer_name, customer_vat, subtotal, vat_amount, total, status, invoice_type, original_invoice_id, note_reason, payment_link, uuid, invoice_hash
     FROM invoices
     WHERE id = $1 AND business_id = $2`,
    [id, businessId]
  )

  const inv = invRes.rows[0]
  if (!inv) {
    return (
      <div className="p-6 space-y-2">
        <div className="font-semibold">Invoice not found</div>
        <div className="text-sm text-gray-600">id param: {id}</div>
        <div className="text-sm text-gray-600">business id: {business.id}</div>
        <Link className="underline" href="/dashboard/invoices">Back</Link>
      </div>
    )
  }

  const itemsRes = await pool.query(
    `SELECT id, description, qty, unit_price, line_total, vat_rate, vat_amount, vat_exempt_reason, unit_code, vat_category
     FROM invoice_items
     WHERE invoice_id = $1
     ORDER BY id ASC`,
    [id]
  )
  const items = itemsRes.rows

  return (
    <div dir="rtl" className="mx-auto max-w-4xl space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="text-xs text-gray-500">تفاصيل الفاتورة</div>
          <div className="mt-2 flex items-center gap-2">
            <h1 className="text-2xl font-semibold">{typeLabel(inv.invoice_type)} {inv.invoice_number}</h1>
            <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${typeClass(inv.invoice_type)}`}>
              {typeLabel(inv.invoice_type)}
            </span>
            <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${statusClass(inv.status)}`}>
              {statusLabel(inv.status)}
            </span>
          </div>
          <p className="mt-1 text-sm text-gray-600">عرض شامل للبيانات والبنود.</p>
        </div>

        <div className="flex gap-2">
          <Link className="rounded-lg border px-4 py-2 text-sm font-semibold hover:bg-gray-50" href="/dashboard/invoices">
            رجوع
          </Link>
          <Link className="rounded-lg bg-black px-4 py-2 text-sm font-semibold text-white hover:opacity-90" href={`/api/invoices/${id}/pdf`}>
            تحميل PDF
          </Link>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <Link
          className="rounded-lg border px-3 py-2 text-xs font-medium hover:bg-gray-50"
          href={`/dashboard/invoices/new?type=credit&original=${inv.id}`}
        >
          إنشاء إشعار دائن
        </Link>
        <Link
          className="rounded-lg border px-3 py-2 text-xs font-medium hover:bg-gray-50"
          href={`/dashboard/invoices/new?type=debit&original=${inv.id}`}
        >
          إنشاء إشعار مدين
        </Link>
      </div>

      <InvoiceStatusActions invoiceId={inv.id} status={inv.status} />
      <LinkPayment invoiceId={inv.id} currentLink={inv.payment_link ?? ""} />

      <div className="rounded-2xl border bg-white p-6 shadow-sm space-y-3 text-sm">
        <div className="text-sm font-semibold">بيانات البائع</div>
        <div className="flex justify-between"><span className="text-gray-500">الاسم</span><span className="font-semibold">{business.name ?? "-"}</span></div>
        <div className="flex justify-between"><span className="text-gray-500">الرقم الضريبي</span><span className="font-semibold">{business.vat_number ?? "-"}</span></div>
        <div className="flex justify-between"><span className="text-gray-500">رقم السجل التجاري</span><span className="font-semibold">{business.cr_number ?? "-"}</span></div>
        {(business.branch_name || business.address_line || business.city) && (
          <div className="flex justify-between">
            <span className="text-gray-500">العنوان</span>
            <span className="font-semibold">
              {[
                business.branch_name,
                business.address_line,
                business.district,
                business.city,
                business.postal_code,
                business.country_code,
              ].filter(Boolean).join("، ")}
            </span>
          </div>
        )}
        <div className="h-px bg-gray-100" />
        <div className="text-sm font-semibold">بيانات العميل</div>
        <div className="flex justify-between"><span className="text-gray-500">العميل</span><span className="font-semibold">{inv.customer_name ?? "-"}</span></div>
        <div className="flex justify-between"><span className="text-gray-500">الرقم الضريبي</span><span className="font-semibold">{inv.customer_vat ?? "-"}</span></div>
        {inv.original_invoice_id && (
          <div className="flex justify-between"><span className="text-gray-500">المرجع</span><span className="font-semibold">{inv.original_invoice_id}</span></div>
        )}
        {inv.note_reason && (
          <div className="flex justify-between"><span className="text-gray-500">السبب</span><span className="font-semibold">{inv.note_reason}</span></div>
        )}
        {(inv.uuid || inv.invoice_hash) && (
          <details className="mt-2 rounded-lg border bg-gray-50 px-3 py-2">
            <summary className="cursor-pointer text-xs font-semibold text-gray-700">تفاصيل تقنية</summary>
            <div className="mt-2 space-y-2 text-xs">
              {inv.uuid && (
                <div className="flex justify-between"><span className="text-gray-500">UUID</span><span className="font-semibold">{inv.uuid}</span></div>
              )}
              {inv.invoice_hash && (
                <div className="flex justify-between"><span className="text-gray-500">Hash</span><span className="font-semibold">{inv.invoice_hash}</span></div>
              )}
            </div>
          </details>
        )}
        <div className="h-px bg-gray-100" />
        <div className="flex justify-between"><span className="text-gray-500">الإجمالي قبل الضريبة</span><span className="font-semibold">{formatSar(inv.subtotal)}</span></div>
        <div className="flex justify-between"><span className="text-gray-500">ضريبة القيمة المضافة</span><span className="font-semibold">{formatSar(inv.vat_amount)}</span></div>
        <div className="flex justify-between"><span className="text-gray-500">الإجمالي</span><span className="text-lg font-bold">{formatSar(inv.total)}</span></div>
        {inv.payment_link && (
          <div className="flex justify-between">
            <span className="text-gray-500">رابط الدفع</span>
            <a className="text-blue-600 underline" href={inv.payment_link} target="_blank" rel="noreferrer">فتح الرابط</a>
          </div>
        )}
      </div>

      <div className="rounded-2xl border bg-white p-6 shadow-sm">
        <div className="mb-3 text-sm font-semibold">بنود الفاتورة</div>
        {items.length === 0 ? (
          <div className="text-sm text-gray-500">لا توجد بنود.</div>
        ) : (
          <div className="space-y-2">
            {items.map((it: any) => (
              <div key={it.id} className="text-sm border rounded-lg p-3 space-y-1">
                <div className="flex justify-between">
                  <div className="font-medium">{it.description}</div>
                  <div className="font-semibold">{formatSar(it.line_total)}</div>
                </div>
                <div className="text-gray-500">الكمية: {it.qty} × السعر: {it.unit_price}</div>
                {it.unit_code && <div className="text-gray-500">الوحدة: {it.unit_code}</div>}
                <div className="text-gray-500">VAT: {(Number(it.vat_rate) * 100).toFixed(0)}% | {formatSar(it.vat_amount)}</div>
                {it.vat_category && <div className="text-gray-500">تصنيف الضريبة: {it.vat_category}</div>}
                {it.vat_exempt_reason && (
                  <div className="text-gray-500">سبب الإعفاء: {it.vat_exempt_reason}</div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
