import Link from "next/link"
import LogoutButton from "@/app/LogoutButton"

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div>
      <header className="flex items-center justify-between border-b p-4">
        <nav className="flex items-center gap-4 text-sm">
            <Link href="/" className="font-semibold">Home</Link> {" "}            
            <Link href="/dashboard/invoices" className="hover:underline">Invoices</Link>
          </nav>
        <LogoutButton />
      </header>

      <main className="p-6">{children}</main>
    </div>
  )
}
