"use client"

import { useState } from "react"
import { getCsrfToken } from "@/lib/csrf-client"

type Props = {
  invoiceId: string
  status: string
}

const transitions: Record<string, Array<{ label: string; status: string }>> = {
  draft: [
    { label: "إصدار", status: "issued" },
    { label: "رفض", status: "rejected" },
  ],
  issued: [
    { label: "إبلاغ", status: "reported" },
    { label: "تصفية", status: "cleared" },
    { label: "رفض", status: "rejected" },
  ],
  reported: [
    { label: "تصفية", status: "cleared" },
    { label: "رفض", status: "rejected" },
  ],
  cleared: [],
  rejected: [],
}

export default function InvoiceStatusActions({ invoiceId, status }: Props) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const actions = transitions[status] ?? []
  if (actions.length === 0) return null

  async function update(nextStatus: string) {
    setLoading(true)
    setError(null)
    const res = await fetch(`/api/invoices/${invoiceId}/status`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-csrf-token": getCsrfToken(),
      },
      body: JSON.stringify({ status: nextStatus }),
    })
    setLoading(false)

    if (!res.ok) {
      setError("تعذر تحديث الحالة")
      return
    }

    location.reload()
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {actions.map((a) => (
        <button
          key={a.status}
          onClick={() => update(a.status)}
          className="rounded-lg border px-3 py-2 text-xs font-semibold hover:bg-gray-50"
          disabled={loading}
        >
          {a.label}
        </button>
      ))}
      {error && <div className="text-xs text-red-600">{error}</div>}
    </div>
  )
}
