"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useCsrfToken } from "@/lib/use-csrf";
import { getCsrfToken } from "@/lib/csrf-client";

export default function SignupPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const router = useRouter();
  const csrf = useCsrfToken();

  async function submit() {
    const token = csrf || getCsrfToken();
    if (!token) return alert("Missing CSRF token. Refresh the page.");

    const res = await fetch("/api/signup", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-csrf-token": token,
      },
      body: JSON.stringify({ email, password }),
    });

    if (!res.ok) return alert(await res.text());
    router.push("/login");
  }

  return (
    <div className="mx-auto flex min-h-[70vh] max-w-5xl items-center px-6 py-12">
      <div className="grid w-full gap-8 lg:grid-cols-2">
        <div className="hidden rounded-3xl border bg-white p-8 shadow-sm lg:block">
          <div className="text-xs text-gray-500">ابدأ الآن</div>
          <h1 className="mt-2 text-2xl font-semibold">أنشئ حسابك</h1>
          <p className="mt-3 text-sm text-gray-600">
            جهّز بيانات منشأتك وابدأ إصدار الفواتير بسرعة.
          </p>
          <div className="mt-6 rounded-2xl border border-dashed bg-gray-50/70 p-4 text-xs text-gray-600">
            يمكنك تعديل بيانات المنشأة لاحقاً من لوحة التحكم.
          </div>
        </div>

        <div className="rounded-3xl border bg-white p-8 shadow-sm">
          <div className="text-xs text-gray-500">إنشاء حساب</div>
          <h1 className="mt-2 text-2xl font-semibold">مرحباً بك</h1>
          <p className="mt-2 text-sm text-gray-600">أدخل البريد الإلكتروني وكلمة المرور.</p>

          <div className="mt-5 space-y-3">
            <div>
              <label className="text-xs text-gray-500">البريد الإلكتروني</label>
              <input
                className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-200"
                placeholder="name@example.com"
                value={email}
                onChange={e=>setEmail(e.target.value)}
              />
            </div>
            <div>
              <label className="text-xs text-gray-500">كلمة المرور</label>
              <input
                className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-200"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={e=>setPassword(e.target.value)}
              />
            </div>
          </div>

          <button className="mt-6 w-full rounded-lg bg-black px-4 py-2 text-sm font-semibold text-white hover:opacity-90" onClick={submit}>
            تسجيل
          </button>
        </div>
      </div>
    </div>
  );
}
