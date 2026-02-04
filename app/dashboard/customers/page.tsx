import CustomersClient from "./CustomersClient"

export const dynamic = "force-dynamic"

export default function CustomersPage() {
  return (
    <div dir="rtl" className="space-y-6">
      <div>
        <div className="text-xs text-gray-500">إدارة العملاء</div>
        <h1 className="mt-2 text-2xl font-semibold">العملاء</h1>
        <p className="mt-1 text-sm text-gray-600">أضف العملاء وحدث بياناتهم بسهولة.</p>
      </div>
      <CustomersClient />
    </div>
  )
}
