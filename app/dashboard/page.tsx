export const dynamic = "force-dynamic"

import { redirect } from "next/navigation"
import { cookies } from "next/headers"
import { verifyToken } from "@/lib/auth"
import { getBusinessByUserId } from "@/lib/business"

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string; error?: string }>
}) {
  const sp = await searchParams

  const cookieStore = await cookies()
  const token = cookieStore.get("token")?.value
  const csrf = cookieStore.get("csrf")?.value ?? ""
  const user = token ? verifyToken(token) : null
  if (!user) redirect("/login")

  const business = await getBusinessByUserId(user.userId)

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-6">
        <div className="text-xs text-gray-500">إعدادات المنشأة</div>
        <h1 className="mt-2 text-2xl font-semibold">بيانات المنشأة</h1>
        <p className="mt-1 text-sm text-gray-600">حدّث بيانات منشأتك لتظهر في الفواتير.</p>
      </div>

      {sp.saved === "1" && (
        <div className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
          تم الحفظ بنجاح
        </div>
      )}
      {sp.error && (
        <div className="mb-4 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
          {sp.error === "missing" && "يرجى تعبئة جميع الحقول المطلوبة."}
          {sp.error === "vat" && "الرقم الضريبي يجب أن يكون 15 رقمًا."}
          {sp.error === "cr" && "رقم السجل التجاري يجب أن يكون 10 أرقام."}
          {sp.error === "postal" && "الرمز البريدي يجب أن يكون 5 أرقام."}
          {sp.error === "csrf" && "تعذر التحقق من CSRF، حدّث الصفحة وحاول مجددًا."}
          {sp.error === "rate" && "عدد كبير من المحاولات، حاول لاحقًا."}
          {!["missing", "vat", "cr", "postal", "csrf", "rate"].includes(sp.error) && "حدث خطأ غير متوقع."}
        </div>
      )}

      <form action="/api/business" method="post" className="rounded-2xl border bg-white p-6 shadow-sm space-y-4">
        <input type="hidden" name="csrf" value={csrf} />
        <div>
          <label className="text-xs text-gray-500">اسم المنشأة</label>
          <input
            name="name"
            className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm"
            placeholder="اسم المنشأة"
            defaultValue={business?.name ?? ""}
            required
          />
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="text-xs text-gray-500">الرقم الضريبي</label>
            <input
              name="vat"
              className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm"
              placeholder="الرقم الضريبي"
              defaultValue={business?.vat_number ?? ""}
              required
            />
          </div>
          <div>
            <label className="text-xs text-gray-500">رقم السجل التجاري</label>
            <input
              name="cr"
              className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm"
              placeholder="رقم السجل التجاري"
              defaultValue={business?.cr_number ?? ""}
              required
            />
          </div>
        </div>
        <div>
          <label className="text-xs text-gray-500">اسم الفرع</label>
          <input
            name="branch_name"
            className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm"
            placeholder="اسم الفرع"
            defaultValue={business?.branch_name ?? ""}
            required
          />
        </div>
        <div>
          <label className="text-xs text-gray-500">العنوان</label>
          <input
            name="address_line"
            className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm"
            placeholder="العنوان (الشارع/الحي)"
            defaultValue={business?.address_line ?? ""}
            required
          />
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          <div>
            <label className="text-xs text-gray-500">الحي</label>
            <input
              name="district"
              className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm"
              placeholder="الحي"
              defaultValue={business?.district ?? ""}
              required
            />
          </div>
          <div>
            <label className="text-xs text-gray-500">المدينة</label>
            <input
              name="city"
              className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm"
              placeholder="المدينة"
              defaultValue={business?.city ?? ""}
              required
            />
          </div>
          <div>
            <label className="text-xs text-gray-500">الرمز البريدي</label>
            <input
              name="postal_code"
              className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm"
              placeholder="الرمز البريدي"
              defaultValue={business?.postal_code ?? ""}
              required
            />
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="text-xs text-gray-500">الدولة</label>
            <input
              name="country_code"
              className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm"
              placeholder="SA"
              defaultValue={business?.country_code ?? "SA"}
              required
            />
          </div>
        </div>
        <button className="w-full rounded-lg bg-black px-4 py-2 text-sm font-semibold text-white hover:opacity-90">
          حفظ البيانات
        </button>
      </form>
    </div>
  )
}
