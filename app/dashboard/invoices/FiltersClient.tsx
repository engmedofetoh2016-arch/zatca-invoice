"use client"

import { useRouter, useSearchParams } from "next/navigation"

export default function FiltersClient() {
  const router = useRouter()
  const sp = useSearchParams()

  const status = sp.get("status") ?? "all"
  const date = sp.get("date") ?? "all"
  const type = sp.get("type") ?? "all"
  const from = sp.get("from") ?? ""
  const to = sp.get("to") ?? ""
  const q = sp.get("q") ?? ""

  function update(next: Record<string, string>) {
    const params = new URLSearchParams(sp.toString())
    Object.entries(next).forEach(([k, v]) => {
      if (!v || v === "all") params.delete(k)
      else params.set(k, v)
    })
    params.delete("page")
    router.replace(`/dashboard/invoices?${params.toString()}`)
  }

  return (
    <div className="flex flex-wrap items-center gap-3 text-xs text-gray-600">
      <div className="flex items-center gap-2">
        <span>الحالة:</span>
        <select
          value={status}
          onChange={(e) => update({ status: e.target.value })}
          className="rounded-lg border border-gray-200 bg-white px-2 py-1"
        >
          <option value="all">الكل</option>
          <option value="issued">صادرة</option>
          <option value="reported">مبلّغ عنها</option>
          <option value="cleared">مصفّاة</option>
          <option value="rejected">مرفوضة</option>
          <option value="draft">مسودة</option>
        </select>
      </div>

      <div className="flex items-center gap-2">
        <span>التاريخ:</span>
        <select
          value={date}
          onChange={(e) => update({ date: e.target.value })}
          className="rounded-lg border border-gray-200 bg-white px-2 py-1"
        >
          <option value="all">الكل</option>
          <option value="month">هذا الشهر</option>
          <option value="last7">آخر 7 أيام</option>
          <option value="custom">مخصص</option>
        </select>
      </div>

      <div className="flex items-center gap-2">
        <span>النوع:</span>
        <select
          value={type}
          onChange={(e) => update({ type: e.target.value })}
          className="rounded-lg border border-gray-200 bg-white px-2 py-1"
        >
          <option value="all">الكل</option>
          <option value="invoice">ضريبية</option>
          <option value="credit">إشعار دائن</option>
          <option value="debit">إشعار مدين</option>
        </select>
      </div>

      <div className="flex items-center gap-2">
        <span>بحث:</span>
        <input
          value={q}
          onChange={(e) => update({ q: e.target.value })}
          placeholder="رقم الفاتورة أو العميل"
          className="rounded-lg border border-gray-200 bg-white px-2 py-1"
        />
      </div>

      {date === "custom" && (
        <div className="flex items-center gap-2">
          <input
            value={from}
            onChange={(e) => update({ from: e.target.value })}
            type="date"
            className="rounded-lg border border-gray-200 bg-white px-2 py-1"
          />
          <span>—</span>
          <input
            value={to}
            onChange={(e) => update({ to: e.target.value })}
            type="date"
            className="rounded-lg border border-gray-200 bg-white px-2 py-1"
          />
        </div>
      )}
    </div>
  )
}
