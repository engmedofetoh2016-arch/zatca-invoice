// app/page.tsx
import Link from "next/link"
import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { verifyToken } from "@/lib/auth"

export default async function HomePage() {
  const cookieStore = await cookies()
  const token = cookieStore.get("token")?.value
  const user = token ? verifyToken(token) : null

  if (user) redirect("/dashboard")

  return (
    <main className="mx-auto max-w-5xl px-6 py-16">
      <div className="grid items-center gap-10 lg:grid-cols-2">
        <div className="space-y-5">
          <div className="inline-flex items-center gap-2 rounded-full border bg-white px-3 py-1 text-xs text-gray-600">
            منصة فواتير احترافية
          </div>
          <h1 className="text-3xl font-bold leading-snug text-gray-900 md:text-4xl">
            أنشئ فواتيرك بسرعة
            <br />
            وامتثل لمتطلبات الزكاة والضريبة
          </h1>
          <p className="text-sm leading-relaxed text-gray-600">
            إدارة كاملة للفواتير، التصدير والاستيراد، وربط المدفوعات في واجهة عربية واضحة.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link href="/login" className="rounded-lg bg-black px-5 py-2 text-sm font-semibold text-white hover:opacity-90">
              تسجيل الدخول
            </Link>
            <Link href="/signup" className="rounded-lg border border-gray-200 bg-white px-5 py-2 text-sm font-semibold text-gray-800 hover:bg-gray-50">
              إنشاء حساب
            </Link>
          </div>
        </div>

        <div className="rounded-3xl border bg-white p-6 shadow-sm">
          <div className="rounded-2xl border border-dashed bg-gray-50/70 p-6">
            <div className="text-xs text-gray-500">مثال سريع</div>
            <div className="mt-3 space-y-2">
              <div className="flex items-center justify-between rounded-lg border bg-white px-3 py-2 text-xs">
                <span className="text-gray-500">رقم الفاتورة</span>
                <span className="font-semibold">INV-0001</span>
              </div>
              <div className="flex items-center justify-between rounded-lg border bg-white px-3 py-2 text-xs">
                <span className="text-gray-500">العميل</span>
                <span className="font-semibold">شركة المستقبل</span>
              </div>
              <div className="flex items-center justify-between rounded-lg border bg-white px-3 py-2 text-xs">
                <span className="text-gray-500">الإجمالي</span>
                <span className="font-semibold">115.00 SAR</span>
              </div>
            </div>
            <div className="mt-4 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-700">
              جاهز للتصدير واستيفاء متطلبات الفوترة
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}
