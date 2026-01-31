export const dynamic = "force-dynamic"

import { redirect } from "next/navigation"
import { cookies } from "next/headers"
import { verifyToken } from "@/lib/auth"
import { getBusinessByUserId } from "@/lib/business"

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string }>
}) {
  const sp = await searchParams

  const cookieStore = await cookies()
  const token = cookieStore.get("token")?.value
  const csrf = cookieStore.get("csrf")?.value ?? ""
  const user = token ? verifyToken(token) : null
  if (!user) redirect("/login")

  const business = await getBusinessByUserId(user.userId)

  return (
    <div className="max-w-xl mx-auto p-6">
      <h1 className="text-xl mb-4">بيانات المنشأة</h1>

      {sp.saved === "1" && (
        <div className="mb-4 p-3 border">
          ✅ تم الحفظ بنجاح
        </div>
      )}

      <form action="/api/business" method="post" className="space-y-3">
        <input type="hidden" name="csrf" value={csrf} />
        <input
          name="name"
          className="border p-2 w-full"
          placeholder="اسم المنشأة"
          defaultValue={business?.name ?? ""}
        />
        <input
          name="vat"
          className="border p-2 w-full"
          placeholder="الرقم الضريبي"
          defaultValue={business?.vat_number ?? ""}
        />
        <input
          name="cr"
          className="border p-2 w-full"
          placeholder="رقم السجل التجاري"
          defaultValue={business?.cr_number ?? ""}
        />
        <button className="bg-black text-white w-full p-2">حفظ</button>
      </form>
    </div>
  )
}
