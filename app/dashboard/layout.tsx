import Link from "next/link"
import { cookies } from "next/headers"
import LogoutButton from "@/app/LogoutButton"
import ThemeToggle from "@/app/ThemeToggle"
import { verifyToken } from "@/lib/auth"

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const cookieStore = await cookies()
  const token = cookieStore.get("token")?.value
  const user = token ? verifyToken(token) : null
  const email = user?.email ?? "user"
  const initials = email.split("@")[0]?.slice(0, 2).toUpperCase()

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-10 border-b bg-white/80 backdrop-blur header-surface header-border">
        <div className="mx-auto max-w-6xl px-4 py-3 sm:px-6 sm:py-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-4">
              <Link href="/dashboard" className="text-sm font-semibold tracking-wide text-gray-900">
                ZATCA INVOICE
              </Link>
              <nav className="hidden items-center gap-4 text-sm text-gray-600 lg:flex">
                <Link href="/dashboard" className="hover:text-gray-900">الرئيسية</Link>
                <Link href="/dashboard/invoices" className="hover:text-gray-900">الفواتير</Link>
                <Link href="/dashboard/customers" className="hover:text-gray-900">العملاء</Link>
                <Link href="/dashboard/products" className="hover:text-gray-900">المنتجات</Link>
                <Link href="/dashboard/units" className="hover:text-gray-900">الوحدات</Link>
                <Link href="/dashboard/reports" className="hover:text-gray-900">التقارير</Link>
                <Link href="/dashboard/zatca" className="hover:text-gray-900">إعدادات ZATCA</Link>
              </nav>
            </div>

            <div className="hidden items-center gap-2 md:flex">
              <Link
                href="/dashboard/invoices/new"
                className="rounded-lg bg-black px-4 py-2 text-xs font-semibold text-white hover:opacity-90"
              >
                + فاتورة جديدة
              </Link>

              <Link
                href="/dashboard/invoices"
                className="rounded-lg border px-3 py-2 text-xs font-semibold text-gray-800 hover:bg-gray-50"
              >
                استيراد CSV
              </Link>

              <div className="flex items-center gap-2 rounded-full border bg-white px-2 py-1 text-xs text-gray-700">
                <div className="grid h-7 w-7 place-items-center rounded-full bg-amber-100 text-[10px] font-semibold text-amber-800">
                  {initials}
                </div>
                <span className="max-w-[120px] truncate">{email}</span>
              </div>

              <ThemeToggle />
              <LogoutButton />
            </div>
          </div>

          <details className="group mt-3 rounded-xl border bg-white/90 p-3 md:hidden">
            <summary className="flex cursor-pointer list-none items-center justify-between text-sm font-semibold text-gray-700">
              القائمة
              <span className="ml-2 flex h-6 w-6 items-center justify-center rounded-full border bg-white text-xs text-gray-500">
                ☰
              </span>
            </summary>
            <div className="mt-3 grid gap-3">
              <nav className="grid gap-2 text-sm text-gray-600">
                <Link href="/dashboard" className="rounded-lg border px-3 py-2 hover:text-gray-900">الرئيسية</Link>
                <Link href="/dashboard/invoices" className="rounded-lg border px-3 py-2 hover:text-gray-900">الفواتير</Link>
                <Link href="/dashboard/customers" className="rounded-lg border px-3 py-2 hover:text-gray-900">العملاء</Link>
                <Link href="/dashboard/products" className="rounded-lg border px-3 py-2 hover:text-gray-900">المنتجات</Link>
                <Link href="/dashboard/units" className="rounded-lg border px-3 py-2 hover:text-gray-900">الوحدات</Link>
                <Link href="/dashboard/reports" className="rounded-lg border px-3 py-2 hover:text-gray-900">التقارير</Link>
                <Link href="/dashboard/zatca" className="rounded-lg border px-3 py-2 hover:text-gray-900">إعدادات ZATCA</Link>
              </nav>

              <div className="grid gap-2">
                <Link
                  href="/dashboard/invoices/new"
                  className="rounded-lg bg-black px-4 py-2 text-center text-xs font-semibold text-white hover:opacity-90"
                >
                  + فاتورة جديدة
                </Link>
                <Link
                  href="/dashboard/invoices"
                  className="rounded-lg border px-3 py-2 text-center text-xs font-semibold text-gray-800 hover:bg-gray-50"
                >
                  استيراد CSV
                </Link>
              </div>

              <div className="flex items-center justify-between gap-2 rounded-xl border bg-white px-3 py-2 text-xs text-gray-700">
                <div className="flex items-center gap-2">
                  <div className="grid h-7 w-7 place-items-center rounded-full bg-amber-100 text-[10px] font-semibold text-amber-800">
                    {initials}
                  </div>
                  <span className="max-w-[150px] truncate">{email}</span>
                </div>
                <div className="flex items-center gap-2">
                  <ThemeToggle />
                  <LogoutButton />
                </div>
              </div>
            </div>
          </details>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8">{children}</main>
    </div>
  )
}
