export const dynamic = "force-dynamic"

import { redirect } from "next/navigation"
import { cookies } from "next/headers"
import { verifyToken } from "@/lib/auth"
import ProductsClient from "./ProductsClient"

export default async function ProductsPage() {
  const cookieStore = await cookies()
  const token = cookieStore.get("token")?.value
  const user = token ? verifyToken(token) : null
  if (!user) redirect("/login")

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <div className="text-xs text-gray-500">الإعدادات</div>
        <h1 className="mt-2 text-2xl font-semibold">إدارة المنتجات</h1>
        <p className="mt-1 text-sm text-gray-600">أضف منتجاتك لتعبئة البنود بسرعة.</p>
      </div>
      <ProductsClient />
    </div>
  )
}
