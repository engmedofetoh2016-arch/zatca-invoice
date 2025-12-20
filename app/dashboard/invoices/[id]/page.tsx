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


  // ✅ Protect by business_id
  const invRes = await pool.query(
  `SELECT id, invoice_number, issue_date, customer_name, customer_vat, subtotal, vat_amount, total
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

  // Optional: load items
  const itemsRes = await pool.query(
    `SELECT id, description, qty, unit_price, line_total
     FROM invoice_items
     WHERE invoice_id = $1
     ORDER BY id ASC`,
    [id]
  )
  const items = itemsRes.rows

  return (
    <div dir="rtl" className="mx-auto max-w-2xl space-y-6 p-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">فاتورة {inv.invoice_number}</h1>
          <p className="mt-1 text-sm text-gray-600">تفاصيل الفاتورة</p>
        </div>

        <div className="flex gap-2">
          <Link className="rounded-lg border px-4 py-2 text-sm hover:bg-gray-50" href="/dashboard/invoices">
            رجوع
          </Link>
          <Link className="rounded-lg bg-black px-4 py-2 text-sm text-white hover:opacity-90" href={`/api/invoices/${id}/pdf`}>
            تحميل PDF
          </Link>
        </div>
      </div>

      <div className="rounded-xl border bg-white p-5 shadow-sm space-y-3 text-sm">
        <div className="flex justify-between"><span className="text-gray-500">العميل</span><span className="font-semibold">{inv.customer_name ?? "-"}</span></div>
        <div className="flex justify-between"><span className="text-gray-500">الرقم الضريبي</span><span className="font-semibold">{inv.customer_vat ?? "-"}</span></div>
        <div className="h-px bg-gray-100" />
        <div className="flex justify-between"><span className="text-gray-500">الإجمالي قبل الضريبة</span><span className="font-semibold">{formatSar(inv.subtotal)}</span></div>
        <div className="flex justify-between"><span className="text-gray-500">ضريبة القيمة المضافة</span><span className="font-semibold">{formatSar(inv.vat_amount)}</span></div>
        <div className="flex justify-between"><span className="text-gray-500">الإجمالي</span><span className="text-lg font-bold">{formatSar(inv.total)}</span></div>
      </div>

      <div className="rounded-xl border bg-white p-5 shadow-sm">
        <div className="mb-3 text-sm font-semibold">بنود الفاتورة</div>
        {items.length === 0 ? (
          <div className="text-sm text-gray-500">لا توجد بنود.</div>
        ) : (
          <div className="space-y-2">
            {items.map((it: any) => (
              <div key={it.id} className="flex justify-between text-sm border rounded-lg p-3">
                <div>
                  <div className="font-medium">{it.description}</div>
                  <div className="text-gray-500">الكمية: {it.qty} × السعر: {it.unit_price}</div>
                </div>
                <div className="font-semibold">{formatSar(it.line_total)}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
