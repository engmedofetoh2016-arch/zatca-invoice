export const dynamic = "force-dynamic"

export default function TermsPage() {
  return (
    <div dir="rtl" className="mx-auto max-w-3xl space-y-6 p-6">
      <div>
        <div className="text-xs text-gray-500">الشروط والأحكام</div>
        <h1 className="mt-2 text-2xl font-semibold">شروط الاستخدام</h1>
        <p className="mt-1 text-sm text-gray-600">آخر تحديث: 2026-02-07</p>
      </div>

      <div className="rounded-2xl border bg-white p-6 shadow-sm space-y-3 text-sm text-gray-700">
        <p>باستخدامك للمنصة، فإنك توافق على هذه الشروط.</p>
        <p>الخدمة مقدمة كما هي، ويجب عليك التأكد من صحة البيانات التي تدخلها.</p>
        <p>يُمنع إساءة استخدام الخدمة أو محاولة اختراقها.</p>
      </div>
    </div>
  )
}
