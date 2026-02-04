"use client"

import { useRouter, useSearchParams } from "next/navigation"
import { useEffect, useState } from "react"
import { getCsrfToken } from "@/lib/csrf-client"

export default function LoginPage() {
  const router = useRouter()
  const sp = useSearchParams()
  const next = sp.get("next") || "/dashboard"

  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [csrf, setCsrf] = useState("") // ✅ store it once

  useEffect(() => {
    setCsrf(getCsrfToken())
  }, [])

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    const token = csrf || getCsrfToken() // ✅ fallback
    if (!token) {
      setError("Missing CSRF token (refresh the page).")
      return
    }

    const res = await fetch("/api/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-csrf-token": token,
      },
      body: JSON.stringify({ email, password }),
    })

    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      setError(data?.error ?? "Login failed")
      return
    }

    router.push(next)
  }

  return (
    <div className="mx-auto flex min-h-[70vh] max-w-5xl items-center px-6 py-12">
      <div className="grid w-full gap-8 lg:grid-cols-2">
        <div className="hidden rounded-3xl border bg-white p-8 shadow-sm lg:block">
          <div className="text-xs text-gray-500">مرحبا بعودتك</div>
          <h1 className="mt-2 text-2xl font-semibold">الدخول إلى لوحة التحكم</h1>
          <p className="mt-3 text-sm text-gray-600">
            تابع فواتيرك، راقب الحالة، وصدّر البيانات بسهولة.
          </p>
          <div className="mt-6 rounded-2xl border border-dashed bg-gray-50/70 p-4 text-xs text-gray-600">
            تلميح: يمكنك استيراد CSV لأتمتة إدخال الفواتير.
          </div>
        </div>

        <form onSubmit={onSubmit} className="rounded-3xl border bg-white p-8 shadow-sm">
          <div className="text-xs text-gray-500">تسجيل الدخول</div>
          <h1 className="mt-2 text-2xl font-semibold">أهلاً بك</h1>
          <p className="mt-2 text-sm text-gray-600">أدخل بيانات حسابك للمتابعة.</p>

          {error && (
            <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700">
              {error}
            </div>
          )}

          <div className="mt-5 space-y-3">
            <div>
              <label className="text-xs text-gray-500">البريد الإلكتروني</label>
              <input
                className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-200"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
              />
            </div>
            <div>
              <label className="text-xs text-gray-500">كلمة المرور</label>
              <input
                className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-200"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                type="password"
              />
            </div>
          </div>

          <button className="mt-6 w-full rounded-lg bg-black px-4 py-2 text-sm font-semibold text-white hover:opacity-90">
            دخول
          </button>
        </form>
      </div>
    </div>
  )
}
