export const dynamic = "force-dynamic"

export default function SupportPage() {
  return (
    <div dir="rtl" className="mx-auto max-w-3xl space-y-6 p-6">
      <div>
        <div className="text-xs text-gray-500">الدعم الفني</div>
        <h1 className="mt-2 text-2xl font-semibold">مركز الدعم</h1>
        <p className="mt-1 text-sm text-gray-600">تواصل معنا لأي استفسار.</p>
      </div>

      <div className="rounded-2xl border bg-white p-6 shadow-sm space-y-2 text-sm text-gray-700">
        <div>البريد: support@example.com</div>
        <div>الهاتف: 0000-000-000</div>
      </div>
    </div>
  )
}
