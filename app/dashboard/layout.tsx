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
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-6 py-4">
          <div className="flex items-center gap-6">
            <Link href="/dashboard" className="text-sm font-semibold tracking-wide text-gray-900">
              ZATCA INVOICE
            </Link>
            <nav className="flex items-center gap-4 text-sm text-gray-600">
              <Link href="/dashboard" className="hover:text-gray-900">الرئيسية</Link>
              <Link href="/dashboard/invoices" className="hover:text-gray-900">الفواتير</Link>
              <Link href="/dashboard/customers" className="hover:text-gray-900">العملاء</Link>
              <Link href="/dashboard/reports" className="hover:text-gray-900">التقارير</Link>
              <Link href="/dashboard/zatca" className="hover:text-gray-900">إعدادات ZATCA</Link>
            </nav>
          </div>

          <div className="flex flex-1 flex-wrap items-center justify-end gap-2">
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
      </header>

      <main className="mx-auto max-w-6xl px-6 py-8">{children}</main>
    </div>
  )
}
