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
        <p>نلتزم بحماية بياناتك وعدم مشاركتها مع أي طرف ثالث إلا عند الضرورة القانونية.</p>
        <p>نستخدم البيانات لتحسين الخدمة وتقديم الدعم الفني وتشغيل النظام بشكل آمن.</p>
        <p>يمكنك طلب تصحيح أو حذف بياناتك عبر البريد الإلكتروني المذكور أدناه وفقاً للأنظمة المعمول بها.</p>
        <p>قد نقوم بتحديث سياسة الخصوصية من وقت لآخر، وسيتم نشر أي تحديثات على هذه الصفحة.</p>
      </div>

      <div className="rounded-2xl border bg-white p-6 shadow-sm space-y-2 text-sm text-gray-700">
        <div className="font-semibold">التواصل بخصوص الخصوصية</div>
        <div>البريد: engmedofetoh2016@gmail.com</div>
        <div>الهاتف: +201507868060</div>
      </div>
    </div>
  )
}
