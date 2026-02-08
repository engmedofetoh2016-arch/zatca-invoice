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
        <p>باستخدامك للمنصة فإنك توافق على هذه الشروط.</p>
        <p>أنت مسؤول عن صحة البيانات التي تدخلها في النظام وعن حفظ سرية بيانات الدخول الخاصة بك.</p>
        <p>يُمنع استخدام المنصة لأي نشاط غير قانوني أو إساءة استخدام قد تؤثر على توفر الخدمة.</p>
        <p>قد نقوم بتحديث هذه الشروط من وقت لآخر، وسيتم نشر أي تحديثات على هذه الصفحة.</p>
      </div>

      <div className="rounded-2xl border bg-white p-6 shadow-sm space-y-2 text-sm text-gray-700">
        <div className="font-semibold">الدعم الفني</div>
        <div>البريد: engmedofetoh2016@gmail.com</div>
        <div>الهاتف: +201507868060</div>
      </div>
    </div>
  )
}
