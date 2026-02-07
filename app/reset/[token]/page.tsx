"use client"

import { useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { getCsrfToken } from "@/lib/csrf-client"
import { useCsrfToken } from "@/lib/use-csrf"

export default function ResetPasswordPage() {
  const params = useParams()
  const router = useRouter()
  const csrf = useCsrfToken()
  const [password, setPassword] = useState("")
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
      const res = await fetch("/api/password/reset", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-csrf-token": token,
        },
        body: JSON.stringify({ token: params?.token, password }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setMessage(data?.error ?? "تعذر إعادة التعيين")
        return
      }
      setMessage("تم تحديث كلمة المرور بنجاح.")
      router.push("/login")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="mx-auto flex min-h-[70vh] max-w-xl items-center px-6 py-12">
      <form onSubmit={submit} className="w-full rounded-3xl border bg-white p-8 shadow-sm space-y-4">
        <div className="text-xs text-gray-500">إعادة تعيين كلمة المرور</div>
        <h1 className="mt-2 text-2xl font-semibold">كلمة مرور جديدة</h1>
        <p className="mt-2 text-sm text-gray-600">اختر كلمة مرور قوية (حروف كبيرة وصغيرة وأرقام).</p>

        <div>
          <label className="text-xs text-gray-500">كلمة المرور</label>
          <input
            className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm"
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
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
          {loading ? "جاري الحفظ..." : "تحديث كلمة المرور"}
        </button>
      </form>
    </div>
  )
}
