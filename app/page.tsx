// app/page.tsx
import Link from "next/link"
import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { verifyToken } from "@/lib/auth"

export default async function HomePage() {
  const cookieStore = await cookies()
  const token = cookieStore.get("token")?.value
  const user = token ? verifyToken(token) : null

  // If logged in → dashboard
  if (user) redirect("/dashboard")

  // If logged out → show login/signup
  return (
    <main className="mx-auto max-w-md p-8 space-y-4 text-center">
      <h1 className="text-2xl font-semibold">مرحباً بك</h1>
      <p className="text-gray-600">سجّل الدخول أو أنشئ حساباً جديداً</p>

      <div className="flex gap-3 justify-center">
        <Link href="/login" className="rounded-lg bg-black px-4 py-2 text-white">
          تسجيل الدخول
        </Link>

        <Link href="/signup" className="rounded-lg border px-4 py-2">
          إنشاء حساب
        </Link>
      </div>
    </main>
  )
}
