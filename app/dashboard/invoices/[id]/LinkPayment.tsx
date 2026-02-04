"use client"

import { useState } from "react"
import { getCsrfToken } from "@/lib/csrf-client"

type Props = {
  invoiceId: string
  currentLink: string
}

export default function LinkPayment({ invoiceId, currentLink }: Props) {
  const [link, setLink] = useState(currentLink)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  async function save() {
    setLoading(true)
    setMessage(null)
    const res = await fetch(`/api/invoices/${invoiceId}/payment-link`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-csrf-token": getCsrfToken(),
      },
      body: JSON.stringify({ link }),
    })
    setLoading(false)
    if (!res.ok) return setMessage("تعذر حفظ الرابط")
    setMessage("تم حفظ الرابط")
  }

  return (
    <div className="rounded-2xl border bg-white p-5 text-sm space-y-2 shadow-sm">
      <div className="font-semibold">رابط الدفع</div>
      <div className="flex gap-2">
        <input
          className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm"
          value={link}
          onChange={(e) => setLink(e.target.value)}
          placeholder="https://"
        />
        <button className="rounded-lg border px-3 text-xs font-semibold hover:bg-gray-50" onClick={save} disabled={loading}>
          حفظ
        </button>
      </div>
      {message && <div className="text-xs text-gray-600">{message}</div>}
    </div>
  )
}
