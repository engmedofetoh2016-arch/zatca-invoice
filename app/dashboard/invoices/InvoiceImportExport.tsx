"use client"

import { useRef, useState } from "react"
import { getCsrfToken } from "@/lib/csrf-client"

export default function InvoiceImportExport() {
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [fileName, setFileName] = useState<string | null>(null)
  const [dragging, setDragging] = useState(false)
  const [open, setOpen] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  async function onImport(fileOverride?: File) {
    setMessage(null)
    const file = fileOverride ?? fileRef.current?.files?.[0]
    if (!file) {
      fileRef.current?.click()
      return setMessage("اختر ملف CSV أولاً")
    }

    const form = new FormData()
    form.append("file", file)

    setLoading(true)
    const res = await fetch("/api/invoices/import", {
      method: "POST",
      headers: { "x-csrf-token": getCsrfToken() },
      body: form,
    })
    setLoading(false)

    if (!res.ok) return setMessage(await res.text())
    const data = await res.json()
    setMessage(`تم الاستيراد: ${data.created}`)
  }

  return (
    <div className="w-full max-w-xl rounded-2xl border bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-sm font-semibold text-gray-900">استيراد/تصدير CSV</div>
          <div className="mt-1 text-xs text-gray-500">
            استورد الفواتير بسرعة أو صدّر بياناتك بنقرة واحدة.
          </div>
        </div>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="rounded-lg border px-3 py-2 text-xs font-semibold text-gray-900 hover:bg-gray-50"
        >
          {open ? "إغلاق" : "فتح"}
        </button>
      </div>

      {open && (
        <>
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <a
              href="/templates/invoices-template.csv"
              className="rounded-lg border px-3 py-2 text-xs font-semibold text-gray-900 hover:bg-gray-50"
            >
              تحميل قالب CSV
            </a>
          <a
            href="/api/invoices/export"
            className="rounded-lg border px-3 py-2 text-xs font-semibold text-gray-900 hover:bg-gray-50"
          >
            تصدير CSV
          </a>
          <a
            href="/api/export/full"
            className="rounded-lg border px-3 py-2 text-xs font-semibold text-gray-900 hover:bg-gray-50"
          >
            تصدير شامل (Excel)
          </a>
          </div>

          <div
            className={`mt-4 rounded-xl border border-dashed p-4 ${dragging ? "border-amber-300 bg-amber-50" : "bg-gray-50/60"}`}
            onDragOver={(e) => {
              e.preventDefault()
              setDragging(true)
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={(e) => {
              e.preventDefault()
              setDragging(false)
              const file = e.dataTransfer.files?.[0]
              if (file) {
                setFileName(file.name)
                void onImport(file)
              }
            }}
          >
            <input
              ref={fileRef}
              type="file"
              accept=".csv,text/csv"
              className="hidden"
              onChange={(e) => {
                setFileName(e.target.files?.[0]?.name ?? null)
                void onImport()
              }}
            />

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="rounded-lg bg-black px-4 py-2 text-xs font-semibold text-white hover:opacity-90"
              >
                {loading ? "جارٍ الاستيراد..." : "استيراد CSV"}
              </button>
              <div className="text-xs text-gray-600">
                {fileName ? `الملف المحدد: ${fileName}` : "اسحب الملف هنا أو اختره"}
              </div>
            </div>
          </div>

          <div className="mt-4 grid gap-3 text-xs text-gray-500">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-emerald-700">أعمدة مطلوبة</span>
              <span className="text-gray-600">invoice_number, item_description, item_qty, item_unit_price</span>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-gray-100 px-2 py-0.5 text-gray-700">أعمدة اختيارية</span>
              <span className="text-gray-600">item_vat_rate, item_vat_exempt_reason, invoice_type, original_invoice_id, note_reason</span>
            </div>
            <div className="text-gray-500">
              يمكنك استيراد ملف صادر من النظام (subtotal, vat_amount, total) بدون أعمدة الأصناف.
            </div>
          </div>

          {message && (
            <div className="mt-3 rounded-lg border bg-gray-50 px-3 py-2 text-xs text-gray-700">
              {message}
            </div>
          )}
        </>
      )}
    </div>
  )
}
