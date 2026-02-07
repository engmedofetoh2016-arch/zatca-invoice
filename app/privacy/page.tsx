export const dynamic = "force-dynamic"

export default function PrivacyPage() {
  return (
    <div dir="rtl" className="mx-auto max-w-3xl space-y-6 p-6">
      <div>
        <div className="text-xs text-gray-500">سياسة الخصوصية</div>
        <h1 className="mt-2 text-2xl font-semibold">الخصوصية وحماية البيانات</h1>
        <p className="mt-1 text-sm text-gray-600">آخر تحديث: 2026-02-07</p>
      </div>

      <div className="rounded-2xl border bg-white p-6 shadow-sm space-y-3 text-sm text-gray-700">
        <p>نلتزم بحماية بياناتك وعدم مشاركتها دون إذن.</p>
        <p>قد نستخدم البيانات لتحسين الخدمة وإصلاح المشاكل.</p>
      </div>
    </div>
  )
}
