"use client"

import { useRef, useState } from "react"
import { getCsrfToken } from "@/lib/csrf-client"

export default function InvoiceImportExport() {
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  async function onImport() {
    setMessage(null)
    const file = fileRef.current?.files?.[0]
    if (!file) return setMessage("اختر ملف CSV أولاً")

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
    <div className="flex flex-wrap items-center gap-3">
      <a
        href="/api/invoices/export"
        className="rounded-lg border px-3 py-2 text-xs font-medium hover:bg-gray-50"
      >
        تنزيل CSV
      </a>

      <div className="flex items-center gap-2">
        <input ref={fileRef} type="file" accept=".csv,text/csv" className="text-xs" />
        <button
          onClick={onImport}
          className="rounded-lg border px-3 py-2 text-xs font-medium hover:bg-gray-50"
          disabled={loading}
        >
          {loading ? "..." : "استيراد CSV"}
        </button>
      </div>

      <div className="text-xs text-gray-500">
        أعمدة مطلوبة: invoice_number,item_description,item_qty,item_unit_price
      </div>
      <div className="text-xs text-gray-400">
        أعمدة اختيارية: item_vat_rate,item_vat_exempt_reason,invoice_type,original_invoice_id,note_reason
      </div>
      {message && <div className="text-xs text-gray-600">{message}</div>}
    </div>
  )
}
