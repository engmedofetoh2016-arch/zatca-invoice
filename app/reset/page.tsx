"use client"

import { useState } from "react"
import { getCsrfToken } from "@/lib/csrf-client"
import { useCsrfToken } from "@/lib/use-csrf"

export default function ResetRequestPage() {
  const csrf = useCsrfToken()
  const [email, setEmail] = useState("")
  const [message, setMessage] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setMessage(null)
    setLoading(true)
    try {
      const token = csrf || getCsrfToken()
      if (!token) {
        setMessage("تعذر التحقق من CSRF، حدّث الصفحة")
        return
      }
      const res = await fetch("/api/password/request", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-csrf-token": token,
        },
        body: JSON.stringify({ email }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setMessage(data?.error ?? "تعذر إرسال الطلب")
        return
      }
      if (data?.resetUrl) {
        setMessage(`رابط إعادة التعيين: ${data.resetUrl}`)
      } else {
        setMessage("إذا كان البريد مسجلاً، سيتم إرسال رابط إعادة التعيين.")
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="mx-auto flex min-h-[70vh] max-w-xl items-center px-6 py-12">
      <form onSubmit={submit} className="w-full rounded-3xl border bg-white p-8 shadow-sm space-y-4">
        <div className="text-xs text-gray-500">إعادة تعيين كلمة المرور</div>
        <h1 className="mt-2 text-2xl font-semibold">نسيت كلمة المرور؟</h1>
        <p className="mt-2 text-sm text-gray-600">أدخل بريدك الإلكتروني لإرسال رابط إعادة التعيين.</p>

        <div>
          <label className="text-xs text-gray-500">البريد الإلكتروني</label>
          <input
            className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm"
            placeholder="name@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>

        {message && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700">
            {message}
          </div>
        )}

        <button
          className="w-full rounded-lg bg-black px-4 py-2 text-sm font-semibold text-white hover:opacity-90"
          disabled={loading}
        >
          {loading ? "جاري الإرسال..." : "إرسال الرابط"}
        </button>
      </form>
    </div>
  )
}
